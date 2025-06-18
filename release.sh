#!/bin/bash

set -e

# --- CONFIGURATION ---
PLUGIN_NAME="phpstorm-time-tracker-ui-v7"
RELEASE_DIR="releases"
BUILD_FILE="build.gradle.kts"
PLUGIN_XML="src/main/resources/META-INF/plugin.xml"
UPDATE_XML="$RELEASE_DIR/updatePlugins.xml"
ZIP_OUTPUT_DIR="build/distributions"
ZIP_BASENAME="$PLUGIN_NAME"
SED_EXT=".bak"
# ----------------------

export PORT=
export TRACKER_SERVER_PORT=
export NEXT_PUBLIC_TRACKER_SERVER_PORT=

# --- 0. Parse version bump argument ---
BUMP_TYPE=${1:-patch}
if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "❌ Invalid bump type: $BUMP_TYPE"
  echo "Usage: ./release.sh [major|minor|patch]"
  exit 1
fi

# --- 1. Extract and bump version ---
CURRENT_VERSION=$(grep -oP 'version\s*=\s*"\K[0-9]+\.[0-9]+\.[0-9]+' "$BUILD_FILE")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$BUMP_TYPE" in
  patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
  minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
  major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
esac

echo "📦 Bumping version: $CURRENT_VERSION → $NEW_VERSION ($BUMP_TYPE)"

# --- 2. Update version in build.gradle.kts ---
sed -i"$SED_EXT" "s/version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" "$BUILD_FILE" && rm -f "$BUILD_FILE$SED_EXT"

# --- 3. Update version in plugin.xml ---
sed -i"$SED_EXT" "s|<version>$CURRENT_VERSION</version>|<version>$NEW_VERSION</version>|" "$PLUGIN_XML" && rm -f "$PLUGIN_XML$SED_EXT"

# --- 3b. Inject <li> release note into <change-notes> ---
RELEASE_DATE=$(date +%F)
INJECTED_LI="<li>$RELEASE_DATE: $COMMIT_MESSAGE</li>"

# Backup original plugin.xml
cp "$PLUGIN_XML" "$PLUGIN_XML$SED_EXT"

# Use awk to inject before the first <li> line inside <change-notes>
awk -v note="$INJECTED_LI" '
  BEGIN { inside = 0 }
  /<change-notes>/ { inside = 1 }
  inside && /<li>/ && !done {
    print note
    done = 1
  }
  { print }
' "$PLUGIN_XML$SED_EXT" > "$PLUGIN_XML"

rm -f "$PLUGIN_XML$SED_EXT"

# --- 4. Build plugin ---
echo "⚙️ Building plugin..."
./gradlew clean buildPlugin > /dev/null 2>&1

# --- 5. Move .zip to /releases ---
ZIP_NAME="$ZIP_BASENAME-$NEW_VERSION.zip"
ZIP_PATH="$ZIP_OUTPUT_DIR/$ZIP_NAME"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "❌ Build failed: $ZIP_PATH not found!"
  exit 1
fi

# remove ZIP files in release dir before moving the new one
rm -f "$RELEASE_DIR/$ZIP_BASENAME-"*.zip

echo "📁 Moving $ZIP_NAME to $RELEASE_DIR/"
mkdir -p "$RELEASE_DIR"
mv "$ZIP_PATH" "$RELEASE_DIR/"

# --- 6. Update updatePlugins.xml ---
echo "📝 Updating updatePlugins.xml..."
sed -i"$SED_EXT" "0,/<version>.*<\/version>/s|<version>.*</version>|<version>$NEW_VERSION</version>|" "$UPDATE_XML" && rm -f "$UPDATE_XML$SED_EXT"
sed -i"$SED_EXT" -E "s|(https://.*/)$ZIP_BASENAME-[0-9]+\.[0-9]+\.[0-9]+\.zip|\1$ZIP_NAME|" "$UPDATE_XML" && rm -f "$UPDATE_XML$SED_EXT"

# --- Parse optional commit message ---
COMMIT_MESSAGE="Release $NEW_VERSION"
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -m)
      shift
      COMMIT_MESSAGE="$1"
      ;;
  esac
  shift
done


# --- 7. Git commit, tag, and push ---
echo "🔀 Committing and tagging release..."
git add . > /dev/null 2>&1
git commit -m "$COMMIT_MESSAGE" > /dev/null 2>&1
git tag -a "v$NEW_VERSION" -m "Release $NEW_VERSION" > /dev/null 2>&1
git push origin main > /dev/null 2>&1
git push origin "v$NEW_VERSION" > /dev/null 2>&1

echo "✅ Release $NEW_VERSION ($BUMP_TYPE) complete!"
