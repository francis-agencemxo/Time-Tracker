PLUGIN_NAME="phpstorm-time-tracker-ui-v7"
RELEASE_DIR="releases"
BUILD_FILE="build.gradle.kts"
PLUGIN_XML="src/main/resources/META-INF/plugin.xml"
UPDATE_XML="$RELEASE_DIR/updatePlugins.xml"
ZIP_OUTPUT_DIR="build/distributions"
ZIP_BASENAME="$PLUGIN_NAME"
SED_EXT=".bak"
REMOTE_USER="dev"
REMOTE_HOST="dev.mxo.agency"

# --- 7. Upload release artifacts to your server ---
echo "🚀 Uploading release to server..."

# --- configure these at the top of your script ---
# REMOTE_USER and REMOTE_HOST should already be set
# e.g. REMOTE_USER=dev, REMOTE_HOST=example.com
REMOTE_PATH_ZIP="/home/dev/www/mxo-utils/phpStormPlugins/phpstorm-time-tracker-ui.zip"
REMOTE_PATH_UPDATES="/home/dev/www/mxo-utils/phpStormPlugins/updatePlugins.xml"
SSH_KEY_FILE="$HOME/.ssh/id_rsa.pub"

# 1) Ensure SSH key is installed on the server
if [ ! -f "$SSH_KEY_FILE" ]; then
  echo "❌ SSH public key not found at $SSH_KEY_FILE"
  exit 1
fi

SSH_KEY_CONTENT=$(<"$SSH_KEY_FILE")
ssh "$REMOTE_USER@$REMOTE_HOST" "grep -qF '$SSH_KEY_CONTENT' ~/.ssh/authorized_keys" >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️ SSH key not found on $REMOTE_HOST – installing it now..."
  ssh-copy-id "$REMOTE_USER@$REMOTE_HOST"
fi

# 2) Copy the ZIP and the XML
scp "$ZIP_PATH"    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH_ZIP"
scp "$UPDATE_XML"    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH_UPDATES"

if [ $? -eq 0 ]; then
  echo "✅ Upload successful!"
else
  echo "❌ Upload failed!"
  exit 1
fi

echo "🎉 Release $NEW_VERSION uploaded to $REMOTE_HOST"
# --- 7. Git commit, tag, and push ---
#echo "🔀 Committing and tagging release..."
#git add . > /dev/null 2>&1
#git commit -m "Release $NEW_VERSION" > /dev/null 2>&1
#git tag -a "v$NEW_VERSION" -m "Release $NEW_VERSION" > /dev/null 2>&1
#git push origin main > /dev/null 2>&1
#git push origin "v$NEW_VERSION" > /dev/null 2>&1

echo "✅ Release $NEW_VERSION ($BUMP_TYPE) complete!"
