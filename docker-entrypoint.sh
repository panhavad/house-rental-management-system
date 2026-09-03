#!/bin/sh
set -e

# Uploaded files (contract PDFs, payment QR images) live outside `public/` and are
# served by the app's /uploads route, so they must sit on a writable persistent
# volume. Failing here with a clear message beats discovering it mid-upload.
UPLOADS_DIR="${UPLOADS_DIR:-/app/data/uploads}"
echo "==> RentalHRM: preparing uploads directory at ${UPLOADS_DIR}..."
mkdir -p "$UPLOADS_DIR"
if [ ! -w "$UPLOADS_DIR" ]; then
  echo "ERROR: ${UPLOADS_DIR} is not writable by $(id -un) (uid $(id -u))." >&2
  echo "       Check the volume mount and its ownership in docker-compose.yml." >&2
  exit 1
fi

echo "==> RentalHRM: applying database migrations..."
npx prisma migrate deploy

echo "==> RentalHRM: enabling SQLite write-ahead logging..."
printf 'PRAGMA journal_mode=WAL;\n' | npx prisma db execute --stdin --schema prisma/schema.prisma

echo "==> RentalHRM: starting server..."
exec "$@"
