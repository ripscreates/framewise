#!/bin/bash
set -euo pipefail

VERSION="9.0.2"
SIGNING_FINGERPRINT="FCF986EA15E6E293A5644F10B4322F04D67658D8"
TARGET="aarch64-apple-darwin"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src-tauri/binaries"
FFMPEG="$OUT/ffmpeg-$TARGET"
FFPROBE="$OUT/ffprobe-$TARGET"
VERIFIED="$OUT/ffmpeg-$TARGET.verified"

verify_profile() {
  local ffmpeg_version build_configuration encoders ffprobe_version
  ffmpeg_version="$("$FFMPEG" -version 2>&1)" || return 1
  build_configuration="$("$FFMPEG" -buildconf 2>&1)" || return 1
  encoders="$("$FFMPEG" -encoders 2>&1)" || return 1
  ffprobe_version="$("$FFPROBE" -version 2>&1)" || return 1

  [[ "$ffmpeg_version" == *"version $VERSION"* ]] || return 1
  [[ "$build_configuration" == *"--enable-videotoolbox"* ]] || return 1
  [[ "$build_configuration" == *"--enable-audiotoolbox"* ]] || return 1
  [[ "$build_configuration" != *"--enable-gpl"* && "$build_configuration" != *"--enable-nonfree"* ]] || return 1
  [[ "$encoders" == *"h264_videotoolbox"* ]] || return 1
  [[ "$encoders" =~ [[:space:]]aac[[:space:]] ]] || return 1
  [[ "$ffprobe_version" == *"version $VERSION"* ]] || return 1
  [[ "$(lipo -archs "$FFMPEG")" == "arm64" ]] || return 1
  [[ "$(lipo -archs "$FFPROBE")" == "arm64" ]] || return 1
}

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  echo "The bundled V2.1 engine build currently targets Apple Silicon macOS only." >&2
  exit 1
fi

for tool in curl gpg make clang tar lipo shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing build tool: $tool. Install Xcode Command Line Tools and GnuPG first." >&2
    exit 1
  fi
done

if [ -x "$FFMPEG" ] && [ -x "$FFPROBE" ] && [ -f "$VERIFIED" ]; then
  EXPECTED_MARKER="9.0.2 $TARGET $(shasum -a 256 "$FFMPEG" | awk '{print $1}') $(shasum -a 256 "$FFPROBE" | awk '{print $1}')"
  if [ "$(cat "$VERIFIED")" = "$EXPECTED_MARKER" ] && verify_profile; then
    echo "Verified Framewise FFmpeg $VERSION sidecars are already staged."
    exit 0
  fi
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/framewise-ffmpeg.XXXXXX")"
cleanup() { rm -r "$TMP"; }
trap cleanup EXIT
export GNUPGHOME="$TMP/gnupg"
mkdir -m 700 "$GNUPGHOME"

cd "$TMP"
curl --fail --location --silent --show-error -O "https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
curl --fail --location --silent --show-error -O "https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz.asc"
curl --fail --location --silent --show-error -o ffmpeg-devel.asc "https://ffmpeg.org/ffmpeg-devel.asc"
gpg --batch --import ffmpeg-devel.asc
ACTUAL_FINGERPRINT="$(gpg --batch --with-colons --fingerprint ffmpeg-devel@ffmpeg.org | awk -F: '$1 == "fpr" { print $10; exit }')"
if [ "$ACTUAL_FINGERPRINT" != "$SIGNING_FINGERPRINT" ]; then
  echo "FFmpeg signing key fingerprint did not match the pinned release key." >&2
  exit 1
fi
gpg --batch --verify "ffmpeg-$VERSION.tar.xz.asc" "ffmpeg-$VERSION.tar.xz"

mkdir source install
tar -xf "ffmpeg-$VERSION.tar.xz" -C source --strip-components=1
cd source
./configure \
  --prefix="$TMP/install" \
  --arch=arm64 \
  --target-os=darwin \
  --enable-videotoolbox \
  --enable-audiotoolbox \
  --disable-autodetect \
  --disable-ffplay \
  --disable-doc \
  --disable-debug \
  --enable-static \
  --disable-shared
make -j"$(sysctl -n hw.ncpu)"
make install

mkdir -p "$OUT"
install -m 755 "$TMP/install/bin/ffmpeg" "$FFMPEG"
install -m 755 "$TMP/install/bin/ffprobe" "$FFPROBE"

if ! verify_profile; then
  echo "The built FFmpeg sidecars did not pass the pinned version, feature, license-profile, or architecture checks." >&2
  exit 1
fi

printf '%s %s %s %s\n' "$VERSION" "$TARGET" "$(shasum -a 256 "$FFMPEG" | awk '{print $1}')" "$(shasum -a 256 "$FFPROBE" | awk '{print $1}')" > "$VERIFIED"

echo "Built verified FFmpeg $VERSION ($TARGET) with VideoToolbox; GPL/nonfree options are disabled."
