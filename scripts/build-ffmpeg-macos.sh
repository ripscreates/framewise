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

if [ -x "$FFMPEG" ] && [ -x "$FFPROBE" ] && [ -f "$VERIFIED" ] \
  && [ "$(cat "$VERIFIED")" = "9.0.2 $TARGET $(shasum -a 256 "$FFMPEG" | awk '{print $1}') $(shasum -a 256 "$FFPROBE" | awk '{print $1}')" ] \
  && "$FFMPEG" -version 2>&1 | head -n 1 | grep -Fq "version $VERSION" \
  && "$FFMPEG" -buildconf 2>&1 | grep -Fq -- "--enable-videotoolbox" \
  && "$FFMPEG" -buildconf 2>&1 | grep -Fq -- "--enable-audiotoolbox" \
  && ! "$FFMPEG" -buildconf 2>&1 | grep -Eiq -- "--enable-(gpl|nonfree)"; then
  echo "Verified Framewise FFmpeg $VERSION sidecars are already staged."
  exit 0
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

"$FFMPEG" -version 2>&1 | head -n 1 | grep -Fq "version $VERSION"
"$FFMPEG" -buildconf 2>&1 | grep -Fq -- "--enable-videotoolbox"
"$FFMPEG" -buildconf 2>&1 | grep -Fq -- "--enable-audiotoolbox"
"$FFMPEG" -encoders 2>&1 | grep -Eq 'h264_videotoolbox'
"$FFMPEG" -encoders 2>&1 | grep -Eq 'aac[[:space:]]'
"$FFPROBE" -version 2>&1 | head -n 1 | grep -Fq "version $VERSION"
[ "$(lipo -archs "$FFMPEG")" = "arm64" ]
[ "$(lipo -archs "$FFPROBE")" = "arm64" ]
if "$FFMPEG" -buildconf 2>&1 | grep -Eiq -- "--enable-(gpl|nonfree)"; then
  echo "Refusing a GPL or nonfree FFmpeg build." >&2
  exit 1
fi

printf '%s %s %s %s\n' "$VERSION" "$TARGET" "$(shasum -a 256 "$FFMPEG" | awk '{print $1}')" "$(shasum -a 256 "$FFPROBE" | awk '{print $1}')" > "$VERIFIED"

echo "Built verified FFmpeg $VERSION ($TARGET) with VideoToolbox; GPL/nonfree options are disabled."
