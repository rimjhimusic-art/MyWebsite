#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_BIN="${NODE_BIN:-/Users/anupambhowmick/.local/node/bin/node}"

if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Error: Node.js binary not found." >&2
  exit 1
fi

exec "$NODE_BIN" "$ROOT_DIR/scripts/autopush/ctl.mjs" "$@"
