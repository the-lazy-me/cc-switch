#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Build macOS app bundle and package it as a release zip.

Usage:
  ./scripts/build-macos.sh [extra tauri args...]

Environment variables:
  TARGET      Build target. Default: auto
              - auto: use universal-apple-darwin when both Rust targets exist
              - ""    : build for current host architecture
              - other : passed to tauri --target
  BUNDLES     Tauri bundle types. Default: app
  OUTPUT_DIR  Output directory. Default: dist/macos
  AUTO_DISABLE_UPDATER_ARTIFACTS
              Default: 1. If no signing key is provided, disable updater
              artifacts to avoid Tauri signing error in local builds.
  APP_VERSION App version used in output file names (defaults to tauri.conf.json)
  ZIP_NAME    Final macOS zip file name
  TAR_GZ_NAME Final updater tar.gz file name (if generated)

Examples:
  ./scripts/build-macos.sh
  TARGET=universal-apple-darwin ./scripts/build-macos.sh
  TARGET="" BUNDLES=app,dmg ./scripts/build-macos.sh --verbose
EOF
  exit 0
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "ERROR: This script must run on macOS." >&2
  exit 1
fi

for cmd in pnpm node ditto; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "ERROR: required command not found: ${cmd}" >&2
    exit 1
  fi
done

resolve_target() {
  local requested="$1"
  if [ "${requested}" != "auto" ]; then
    printf "%s" "${requested}"
    return
  fi

  if ! command -v rustup >/dev/null 2>&1; then
    printf ""
    return
  fi

  local installed
  installed="$(rustup target list --installed || true)"
  if printf "%s\n" "${installed}" | grep -qx "aarch64-apple-darwin" &&
    printf "%s\n" "${installed}" | grep -qx "x86_64-apple-darwin"; then
    printf "universal-apple-darwin"
    return
  fi

  printf ""
}

TARGET="${TARGET:-auto}"
BUNDLES="${BUNDLES:-app}"
OUTPUT_DIR="${OUTPUT_DIR:-dist/macos}"
AUTO_DISABLE_UPDATER_ARTIFACTS="${AUTO_DISABLE_UPDATER_ARTIFACTS:-1}"

BUILD_TARGET="$(resolve_target "${TARGET}")"

APP_VERSION="${APP_VERSION:-}"
if [ -z "${APP_VERSION}" ]; then
  APP_VERSION="$(node -e 'console.log(require("./src-tauri/tauri.conf.json").version)')"
fi

ZIP_NAME="${ZIP_NAME:-启航-AI-编程助手-v${APP_VERSION}-macOS.zip}"
TAR_GZ_NAME="${TAR_GZ_NAME:-启航-AI-编程助手-v${APP_VERSION}-macOS.tar.gz}"

echo "[meta] app version: ${APP_VERSION}"
echo "[meta] target: ${BUILD_TARGET:-host-default}"
echo "[meta] bundles: ${BUNDLES}"
echo "[meta] output dir: ${OUTPUT_DIR}"

if [ ! -d node_modules ]; then
  echo "[prep] node_modules not found, running pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile
fi

echo "[1/3] Building macOS bundle"
TAURI_CONFIG_OVERRIDE=""
if [ "${AUTO_DISABLE_UPDATER_ARTIFACTS}" = "1" ] &&
  [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ] &&
  [ -z "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]; then
  TAURI_CONFIG_OVERRIDE="$(mktemp "${TMPDIR:-/tmp}/tauri-local-override.XXXXXX.json")"
  cat >"${TAURI_CONFIG_OVERRIDE}" <<'EOF'
{
  "bundle": {
    "createUpdaterArtifacts": false
  }
}
EOF
  echo "[meta] signing key not found, auto-disable updater artifacts for local build"
  trap 'rm -f "${TAURI_CONFIG_OVERRIDE}"' EXIT
fi

if [ -n "${BUILD_TARGET}" ]; then
  if [ -n "${TAURI_CONFIG_OVERRIDE}" ]; then
    pnpm tauri build --bundles "${BUNDLES}" --target "${BUILD_TARGET}" --config "${TAURI_CONFIG_OVERRIDE}" "$@"
  else
    pnpm tauri build --bundles "${BUNDLES}" --target "${BUILD_TARGET}" "$@"
  fi
else
  if [ -n "${TAURI_CONFIG_OVERRIDE}" ]; then
    pnpm tauri build --bundles "${BUNDLES}" --config "${TAURI_CONFIG_OVERRIDE}" "$@"
  else
    pnpm tauri build --bundles "${BUNDLES}" "$@"
  fi
fi

candidate_dirs=()
if [ -n "${BUILD_TARGET}" ]; then
  candidate_dirs+=("src-tauri/target/${BUILD_TARGET}/release/bundle/macos")
fi
candidate_dirs+=(
  "src-tauri/target/universal-apple-darwin/release/bundle/macos"
  "src-tauri/target/aarch64-apple-darwin/release/bundle/macos"
  "src-tauri/target/x86_64-apple-darwin/release/bundle/macos"
  "src-tauri/target/release/bundle/macos"
)

BUNDLE_DIR=""
for path in "${candidate_dirs[@]}"; do
  if [ -d "${path}" ]; then
    BUNDLE_DIR="${path}"
    break
  fi
done

if [ -z "${BUNDLE_DIR}" ]; then
  echo "ERROR: macOS bundle directory not found under src-tauri/target." >&2
  exit 1
fi

APP_PATH="$(find "${BUNDLE_DIR}" -maxdepth 1 -name "*.app" -type d | head -1 || true)"
if [ -z "${APP_PATH}" ]; then
  echo "ERROR: no .app bundle found in ${BUNDLE_DIR}" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"
OUTPUT_DIR_ABS="$(cd "${OUTPUT_DIR}" && pwd)"
ZIP_PATH="${OUTPUT_DIR_ABS}/${ZIP_NAME}"
TAR_GZ_PATH="${OUTPUT_DIR_ABS}/${TAR_GZ_NAME}"

echo "[2/3] Packaging app bundle"
APP_DIR="$(dirname "${APP_PATH}")"
APP_NAME="$(basename "${APP_PATH}")"
rm -f "${ZIP_PATH}"
(
  cd "${APP_DIR}"
  ditto -c -k --sequesterRsrc --keepParent "${APP_NAME}" "${ZIP_PATH}"
)

TAR_GZ_SRC="$(find "${BUNDLE_DIR}" -maxdepth 1 -name "*.tar.gz" -type f | head -1 || true)"
if [ -n "${TAR_GZ_SRC}" ]; then
  cp "${TAR_GZ_SRC}" "${TAR_GZ_PATH}"
  if [ -f "${TAR_GZ_SRC}.sig" ]; then
    cp "${TAR_GZ_SRC}.sig" "${TAR_GZ_PATH}.sig"
  fi
  echo "[meta] updater artifact copied: ${TAR_GZ_NAME}"
fi

echo "[3/3] Done. Output:"
ls -lh "${OUTPUT_DIR_ABS}"
