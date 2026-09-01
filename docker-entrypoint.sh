#!/bin/sh
set -e

echo "==> RentalHRM: applying database migrations..."
npx prisma migrate deploy

echo "==> RentalHRM: starting server..."
exec "$@"
