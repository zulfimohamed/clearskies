#!/usr/bin/env bash
# Builds a Chrome Web Store-ready zip of the extension into dist/.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -e "console.log(require('./manifest.json').version)")"
DIST_DIR="$ROOT_DIR/dist"
ZIP_NAME="clearskies-v${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

mkdir -p "$DIST_DIR"
rm -f "$ZIP_PATH"

zip -r -X "$ZIP_PATH" \
  manifest.json \
  dictionary.json \
  shared \
  content \
  popup \
  background \
  icons \
  -x '*.DS_Store'

echo "Packaged $ZIP_PATH"
