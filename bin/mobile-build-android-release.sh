#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}}"

export ANDROID_SDK_ROOT
export ANDROID_HOME="${ANDROID_SDK_ROOT}"
export CI=1
export NODE_ENV="${NODE_ENV:-production}"

configure_release_signing() {
  local build_gradle="$1"

  perl -0pi -e 's/signingConfigs \{\n        debug \{\n            storeFile file\('\''debug\.keystore'\''\)\n            storePassword '\''android'\''\n            keyAlias '\''androiddebugkey'\''\n            keyPassword '\''android'\''\n        \}\n    \}/signingConfigs {\n        debug {\n            storeFile file('\''debug.keystore'\'')\n            storePassword '\''android'\''\n            keyAlias '\''androiddebugkey'\''\n            keyPassword '\''android'\''\n        }\n        release {\n            if (System.getenv("ANDROID_UPLOAD_KEYSTORE_PATH")) {\n                storeFile file(System.getenv("ANDROID_UPLOAD_KEYSTORE_PATH"))\n                storePassword System.getenv("ANDROID_UPLOAD_KEYSTORE_PASSWORD")\n                keyAlias System.getenv("ANDROID_UPLOAD_KEY_ALIAS")\n                keyPassword System.getenv("ANDROID_UPLOAD_KEY_PASSWORD")\n            }\n        }\n    \}/s' "$build_gradle"
  perl -0pi -e 's/(release \{\n(?:\s*\/\/.*\n)*)\s*signingConfig signingConfigs\.debug/${1}            signingConfig System.getenv("ANDROID_UPLOAD_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug/s' "$build_gradle"
}

verify_single_signer() {
  local aab_path="$1"
  local signer_count

  signer_count="$(zipinfo -1 "$aab_path" 'META-INF/*.RSA' 'META-INF/*.DSA' 'META-INF/*.EC' | wc -l | tr -d ' ')"
  if [[ "$signer_count" != "1" ]]; then
    echo "AAB 서명 개수가 올바르지 않습니다: ${signer_count}" >&2
    exit 1
  fi
}

verify_expected_signer() {
  local aab_path="$1"
  local bundle_sha256
  local keystore_sha256

  if [[ -z "${ANDROID_UPLOAD_KEYSTORE_PATH:-}" ]]; then
    return 0
  fi

  bundle_sha256="$(
    keytool -printcert -jarfile "$aab_path" 2>/dev/null \
      | sed -n 's/.*SHA256:[[:space:]]*//p' \
      | head -n 1 \
      | tr -d '[:space:]' \
      | tr '[:lower:]' '[:upper:]'
  )"
  keystore_sha256="$(
    keytool -list -v \
      -keystore "${ANDROID_UPLOAD_KEYSTORE_PATH}" \
      -storepass "${ANDROID_UPLOAD_KEYSTORE_PASSWORD}" \
      -alias "${ANDROID_UPLOAD_KEY_ALIAS}" \
      -keypass "${ANDROID_UPLOAD_KEY_PASSWORD}" 2>/dev/null \
      | sed -n 's/.*SHA256:[[:space:]]*//p' \
      | head -n 1 \
      | tr -d '[:space:]' \
      | tr '[:lower:]' '[:upper:]'
  )"

  if [[ -z "$bundle_sha256" || -z "$keystore_sha256" ]]; then
    echo "AAB 또는 업로드 키의 SHA256 지문을 확인할 수 없습니다." >&2
    exit 1
  fi

  if [[ "$bundle_sha256" != "$keystore_sha256" ]]; then
    echo "AAB 서명 지문이 업로드 키와 일치하지 않습니다." >&2
    exit 1
  fi
}

if ! command -v npx >/dev/null 2>&1; then
  echo "npx가 필요합니다." >&2
  exit 1
fi

cd "${MOBILE_DIR}"
npx expo prebuild --platform android --no-install

if [[ -n "${ANDROID_UPLOAD_KEYSTORE_PATH:-}" ]]; then
  : "${ANDROID_UPLOAD_KEYSTORE_PASSWORD:?ANDROID_UPLOAD_KEYSTORE_PASSWORD가 필요합니다.}"
  : "${ANDROID_UPLOAD_KEY_ALIAS:?ANDROID_UPLOAD_KEY_ALIAS가 필요합니다.}"
  : "${ANDROID_UPLOAD_KEY_PASSWORD:?ANDROID_UPLOAD_KEY_PASSWORD가 필요합니다.}"
  configure_release_signing "${MOBILE_DIR}/android/app/build.gradle"
fi

cd android
./gradlew --no-daemon --no-parallel bundleRelease

AAB_PATH="${PWD}/app/build/outputs/bundle/release/app-release.aab"

if [[ ! -f "${AAB_PATH}" ]]; then
  echo "AAB 파일을 찾을 수 없습니다: ${AAB_PATH}" >&2
  exit 1
fi

jarsigner -verify -certs "${AAB_PATH}" >/dev/null
verify_single_signer "${AAB_PATH}"
verify_expected_signer "${AAB_PATH}"

printf '%s\n' "${AAB_PATH}"
