#!/usr/bin/env bash
# Deploy Timelink frontend to production S3 + CloudFront invalidation.
# Requires AWS credentials with access to account 160885253413 (DevOps role).
#
# Usage:
#   AWS_PROFILE=devops bash bin/fe-deploy-prod.sh
#
# Or with explicit credentials:
#   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... bash bin/fe-deploy-prod.sh
set -euo pipefail

BUCKET="${FRONTEND_BUCKET:-planner-frontend-prod-160885253413}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
REGION="${AWS_REGION:-ap-northeast-2}"
DIST_DIR="$(dirname "$0")/../fe/dist"

echo "Building frontend..."
(cd "$(dirname "$0")/.." && npm run fe:build)

echo "Syncing to s3://${BUCKET}/"
aws s3 sync "${DIST_DIR}" "s3://${BUCKET}/" \
  --region "${REGION}" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp "${DIST_DIR}/index.html" "s3://${BUCKET}/index.html" \
  --region "${REGION}" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

if [[ -n "${DISTRIBUTION_ID}" ]]; then
  echo "Invalidating CloudFront distribution ${DISTRIBUTION_ID}..."
  aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*"
else
  echo "Tip: Set CLOUDFRONT_DISTRIBUTION_ID env var to also invalidate cache."
fi

echo "Deploy complete."
