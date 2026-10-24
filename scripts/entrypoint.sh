#!/bin/sh
set -eu
node scripts/migrate.mjs
exec node apps/console/server.js
