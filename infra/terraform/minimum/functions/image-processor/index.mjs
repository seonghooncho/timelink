import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import sharp from 'sharp';

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES || 15 * 1024 * 1024);

const PURPOSE_PREFIX = {
  MEMBER: 'member',
  GROUP: 'group',
  SCHEDULE: 'schedule',
};

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const handler = async (event) => {
  const records = event.Records || [];
  for (const record of records) {
    await processRecord(record).catch((error) => {
      console.error('Image processing failed', {
        error: error?.message,
        stack: error?.stack,
        record,
      });
    });
  }
};

async function processRecord(record) {
  const bucket = record.s3?.bucket?.name || BUCKET_NAME;
  const key = decodeS3Key(record.s3?.object?.key);
  if (!bucket || !key || !key.startsWith('upload/')) {
    console.log('Skip non-upload object', { bucket, key });
    return;
  }

  const parsed = parseUploadKey(key);
  let imageId = parsed.imageId;
  let purpose = parsed.purpose;
  let ownerUserId = parsed.ownerUserId;
  let targetId = null;

  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const metadata = head.Metadata || {};
    imageId = metadata['image-id'] || parsed.imageId;
    purpose = normalizePurpose(metadata.purpose || parsed.purpose);
    ownerUserId = metadata['owner-user-id'] || parsed.ownerUserId;
    validateImageObject(head, imageId, purpose, ownerUserId);

    const uploadRecord = await getImageRecord(imageId);
    targetId = metadata['target-id'] || getString(uploadRecord, 'targetId') || null;
    const source = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const inputBuffer = await streamToBuffer(source.Body);
    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const destinationKey = buildDestinationKey(purpose, targetId || ownerUserId, imageId);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      Body: webpBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        'source-upload-key': key,
        'image-id': imageId,
        purpose,
      },
    }));

    const publicUrl = buildPublicUrl(destinationKey);
    await markImageCompleted(imageId, destinationKey, publicUrl);
    if (targetId) {
      await updateTargetEntity({ purpose, targetId, ownerUserId, imageId, destinationKey, publicUrl });
    }

    console.log('Image processed', { imageId, purpose, targetId, destinationKey });
  } catch (error) {
    await markImageFailed(imageId, purpose, ownerUserId, targetId, error);
    throw error;
  }
}

function decodeS3Key(value) {
  return value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
}

function parseUploadKey(key) {
  const parts = key.split('/');
  const prefix = parts[1];
  const ownerUserId = parts[2];
  const imageId = parts[3];
  const purpose = Object.entries(PURPOSE_PREFIX)
    .find(([, value]) => value === prefix)?.[0];
  return { purpose, ownerUserId, imageId };
}

function normalizePurpose(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!PURPOSE_PREFIX[normalized]) {
    throw new Error(`Unsupported image purpose: ${value}`);
  }
  return normalized;
}

function validateImageObject(head, imageId, purpose, ownerUserId) {
  if (!imageId || !purpose || !ownerUserId) {
    throw new Error('Missing required image metadata');
  }

  const contentType = String(head.ContentType || '').toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Unsupported image content type: ${head.ContentType}`);
  }

  const contentLength = Number(head.ContentLength || 0);
  if (contentLength <= 0) {
    throw new Error('Image object is empty');
  }
  if (contentLength > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image object exceeds ${MAX_IMAGE_SIZE_BYTES} bytes`);
  }
}

async function getImageRecord(imageId) {
  const result = await dynamodb.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
  }));
  return result.Item || {};
}

function getString(item, name) {
  return item?.[name]?.S || null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildDestinationKey(purpose, targetOrOwnerId, imageId) {
  const prefix = PURPOSE_PREFIX[purpose];
  return `public/${prefix}/${sanitizePathPart(targetOrOwnerId)}/${imageId}.webp`;
}

function sanitizePathPart(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
}

function buildPublicUrl(key) {
  if (PUBLIC_BASE_URL) {
    return `${PUBLIC_BASE_URL}/${key}`;
  }
  return `/${key}`;
}

async function markImageCompleted(imageId, publicKey, publicUrl) {
  await dynamodb.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: 'SET #status = :status, publicKey = :publicKey, publicUrl = :publicUrl, updatedAt = :updatedAt REMOVE failureReason',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': { S: 'COMPLETED' },
      ':publicKey': { S: publicKey },
      ':publicUrl': { S: publicUrl },
      ':updatedAt': { S: new Date().toISOString() },
    },
  }));
}

async function updateTargetEntity({ purpose, targetId, ownerUserId, imageId, destinationKey, publicUrl }) {
  const key = getTargetKey(purpose, targetId, ownerUserId);
  if (!key) return;

  const urlAttribute = purpose === 'MEMBER' ? 'avatarUrl' : 'imageUrl';
  try {
    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: `SET ${urlAttribute} = :url, imageId = :imageId, imageStatus = :status, imageObjectKey = :objectKey, updatedAt = :updatedAt`,
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
      ExpressionAttributeValues: {
        ':url': { S: publicUrl },
        ':imageId': { S: imageId },
        ':status': { S: 'COMPLETED' },
        ':objectKey': { S: destinationKey },
        ':updatedAt': { S: new Date().toISOString() },
      },
    }));
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') {
      console.log('Skip target update because entity does not exist yet', { purpose, targetId, imageId });
      return;
    }
    throw error;
  }
}

function getTargetKey(purpose, targetId, ownerUserId) {
  if (purpose === 'MEMBER') {
    return {
      PK: { S: `USER#${targetId}` },
      SK: { S: 'PROFILE' },
    };
  }
  if (purpose === 'GROUP') {
    return {
      PK: { S: `GROUP#${targetId}` },
      SK: { S: 'METADATA' },
    };
  }
  if (purpose === 'SCHEDULE') {
    return {
      PK: { S: `USER#${ownerUserId}` },
      SK: { S: `SCHEDULE#${targetId}` },
    };
  }
  return null;
}

async function markImageFailed(imageId, purpose, ownerUserId, targetId, error) {
  if (!imageId) return;

  const failureReason = String(error?.message || 'Image processing failed').slice(0, 500);
  await dynamodb.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: 'SET #status = :status, failureReason = :failureReason, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': { S: 'FAILED' },
      ':failureReason': { S: failureReason },
      ':updatedAt': { S: new Date().toISOString() },
    },
  }));

  if (targetId && purpose) {
    const key = getTargetKey(purpose, targetId, ownerUserId);
    if (key) {
      await dynamodb.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: key,
        UpdateExpression: 'SET imageStatus = :status, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':status': { S: 'FAILED' },
          ':updatedAt': { S: new Date().toISOString() },
        },
      })).catch((targetError) => {
        console.error('Failed to mark target image as failed', {
          imageId,
          targetId,
          error: targetError?.message,
        });
      });
    }
  }
}
