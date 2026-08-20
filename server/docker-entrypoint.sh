#!/bin/sh
set -e

# The uploads volume is already root-owned from before this image ran
# non-root; chown it here (as root, before dropping privileges) rather
# than in the image build, since a mounted volume overrides whatever
# ownership the image set at build time.
chown -R node:node /app/uploads

echo "Applying database migrations..."
su-exec node npx prisma migrate deploy

echo "Starting API server..."
exec su-exec node node dist/index.js
