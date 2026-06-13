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

// S3 upload/ 객체를 WebP로 변환하고 DB 이미지 상태와 대상 엔티티를 갱신한다.
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
  GROUP_INTRO: 'group-intro',
  GROUP_POST: 'group-post',
  COMMUNITY_POST: 'community-post',
};

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const THUMBNAIL_PURPOSES = new Set(['MEMBER', 'GROUP']);
const IMAGE_VARIANTS = {
  full: {
    width: 2000,
    height: 2000,
    fit: 'inside',
    quality: 88,
  },
  thumbnail: {
    width: 360,
    height: 360,
    fit: 'cover',
    quality: 68,
  },
};

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
    // presigned PUT의 메타데이터를 우선 사용하고, 누락 시 upload key 규칙으로 보정한다.
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
    const destinationOwner = targetId || ownerUserId;
    const fullVariant = await createVariant(inputBuffer, IMAGE_VARIANTS.full);
    const destinationKey = buildDestinationKey(purpose, destinationOwner, imageId, 'full');
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: destinationKey,
      Body: fullVariant,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        'source-upload-key': key,
        'image-id': imageId,
        purpose,
        variant: 'full',
      },
    }));

    let thumbnailKey = null;
    let thumbnailUrl = null;
    if (shouldCreateThumbnail(purpose)) {
      const thumbnailVariant = await createVariant(inputBuffer, IMAGE_VARIANTS.thumbnail);
      thumbnailKey = buildDestinationKey(purpose, destinationOwner, imageId, 'thumbnail');
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailVariant,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          'source-upload-key': key,
          'image-id': imageId,
          purpose,
          variant: 'thumbnail',
        },
      }));
      thumbnailUrl = buildPublicUrl(thumbnailKey);
    }

    const publicUrl = buildPublicUrl(destinationKey);
    await markImageCompleted(imageId, destinationKey, publicUrl, thumbnailKey, thumbnailUrl);
    if (targetId) {
      // 생성 직후 targetId가 연결된 경우 최종 WebP URL까지 대상 엔티티에 반영한다.
      await updateTargetEntity({ purpose, targetId, ownerUserId, imageId, destinationKey, publicUrl, thumbnailKey, thumbnailUrl });
    }

    console.log('Image processed', { imageId, purpose, targetId, destinationKey, thumbnailKey });
  } catch (error) {
    await markImageFailed(imageId, purpose, ownerUserId, targetId, error);
    throw error;
  }
}

function decodeS3Key(value) {
  return value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
}

function parseUploadKey(key) {
  // upload/<purpose>/<owner>/<imageId>/original.ext 규칙을 fallback 메타데이터로 사용한다.
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

function createVariant(inputBuffer, variant) {
  return sharp(inputBuffer)
    .rotate()
    .resize({
      width: variant.width,
      height: variant.height,
      fit: variant.fit,
      withoutEnlargement: true,
    })
    .webp({ quality: variant.quality })
    .toBuffer();
}

function shouldCreateThumbnail(purpose) {
  return THUMBNAIL_PURPOSES.has(purpose);
}

function buildDestinationKey(purpose, targetOrOwnerId, imageId, variantName) {
  const prefix = PURPOSE_PREFIX[purpose];
  return `public/${prefix}/${sanitizePathPart(targetOrOwnerId)}/${imageId}/${variantName}.webp`;
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

async function markImageCompleted(imageId, publicKey, publicUrl, thumbnailKey, thumbnailUrl) {
  const updateParts = [
    '#status = :status',
    'publicKey = :publicKey',
    'publicUrl = :publicUrl',
    'updatedAt = :updatedAt',
  ];
  const values = {
    ':status': { S: 'COMPLETED' },
    ':publicKey': { S: publicKey },
    ':publicUrl': { S: publicUrl },
    ':updatedAt': { S: new Date().toISOString() },
  };

  if (thumbnailKey && thumbnailUrl) {
    updateParts.push('thumbnailKey = :thumbnailKey', 'thumbnailUrl = :thumbnailUrl');
    values[':thumbnailKey'] = { S: thumbnailKey };
    values[':thumbnailUrl'] = { S: thumbnailUrl };
  }

  await dynamodb.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: `SET ${updateParts.join(', ')} REMOVE failureReason`,
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: values,
  }));
}

async function updateTargetEntity({ purpose, targetId, ownerUserId, imageId, destinationKey, publicUrl, thumbnailKey, thumbnailUrl }) {
  const key = getTargetKey(purpose, targetId, ownerUserId);
  if (!key) return;

  const urlAttribute = purpose === 'MEMBER' ? 'avatarUrl' : 'imageUrl';
  const updateParts = [
    `${urlAttribute} = :url`,
    'imageId = :imageId',
    'imageStatus = :status',
    'imageObjectKey = :objectKey',
    'updatedAt = :updatedAt',
  ];
  const values = {
    ':url': { S: publicUrl },
    ':imageId': { S: imageId },
    ':status': { S: 'COMPLETED' },
    ':objectKey': { S: destinationKey },
    ':updatedAt': { S: new Date().toISOString() },
  };

  if (thumbnailKey && thumbnailUrl) {
    updateParts.push('thumbnailUrl = :thumbnailUrl', 'thumbnailObjectKey = :thumbnailObjectKey');
    values[':thumbnailUrl'] = { S: thumbnailUrl };
    values[':thumbnailObjectKey'] = { S: thumbnailKey };
  }

  try {
    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
      ExpressionAttributeValues: values,
    }));
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') {
      // 그룹/일정 생성보다 Lambda가 먼저 끝난 경우 attach API가 나중에 다시 연결한다.
      console.log('Skip target update because entity does not exist yet', { purpose, targetId, imageId });
      return;
    }
    throw error;
  }
}

function getTargetKey(purpose, targetId, ownerUserId) {
  if (purpose === 'MEMBER') {
    const groupMemberTarget = parseGroupMemberTarget(targetId);
    if (groupMemberTarget) {
      return {
        PK: { S: `GROUP#${groupMemberTarget.groupId}` },
        SK: { S: `MEMBER#${groupMemberTarget.userId}` },
      };
    }
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
  if (purpose === 'GROUP_POST' || purpose === 'COMMUNITY_POST') {
    return {
      PK: { S: `POST#${targetId}` },
      SK: { S: 'METADATA' },
    };
  }
  return null;
}

function parseGroupMemberTarget(targetId) {
  const parts = String(targetId || '').split('#');
  if (parts.length === 3 && parts[0] === 'GROUP_MEMBER' && parts[1] && parts[2]) {
    return { groupId: parts[1], userId: parts[2] };
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
    // 이미지 레코드와 실제 대상 엔티티의 실패 상태를 맞춰 UI가 placeholder를 보여주게 한다.
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
