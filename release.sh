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
# ----------------------

# --- 1. Extract and increment version ---
CURRENT_VERSION=$(grep -oP 'version\s*=\s*"\K[0-9]+\.[0-9]+\.[0-9]+' "$BUILD_FILE")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
echo "📦 Current version: $CURRENT_VERSION → New version: $NEW_VERSION"

# --- 2. Update version in build.gradle.kts ---
sed -i "s/version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" "$BUILD_FILE"

# --- 3. Update version in plugin.xml ---
sed -i "s|<version>$CURRENT_VERSION</version>|<version>$NEW_VERSION</version>|" "$PLUGIN_XML"

# --- 4. Build plugin ---
echo "⚙️  Building plugin..."
./gradlew clean buildPlugin

# --- 5. Move .zip to /releases ---
ZIP_NAME="$ZIP_BASENAME-$NEW_VERSION.zip"
ZIP_PATH="$ZIP_OUTPUT_DIR/$ZIP_NAME"
echo "📁 Moving $ZIP_NAME to $RELEASE_DIR/"
mkdir -p "$RELEASE_DIR"
mv "$ZIP_PATH" "$RELEASE_DIR/"

# --- 6. Update updatePlugins.xml ---
echo "📝 Updating updatePlugins.xml..."
sed -i "s|<version>.*</version>|<version>$NEW_VERSION</version>|" "$UPDATE_XML"
sed -i "s|<download-url>.*</download-url>|<download-url>https://raw.githubusercontent.com/francis-agencemxo/Time-Tracker/main/releases/$ZIP_NAME</download-url>|" "$UPDATE_XML"

echo "✅ Release $NEW_VERSION complete!"
