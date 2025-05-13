#!/bin/bash

REMOTE_USER="dev"
REMOTE_HOST="dev.mxo.agency"

# Check if netcat (nc) is available
if command -v nc > /dev/null; then
    nc -z -w 5 $REMOTE_HOST 22
else
    # Fallback to SSH with a timeout
    timeout 5 bash -c "cat < /dev/null > /dev/tcp/dev.mxo.agency/22"
fi

# Capture the exit status
if [ $? -eq 0 ]; then
    echo ""
else
    echo "$REMOTE_HOST:22 SSH Server is NOT reachable. start VPN."
    exit 1
fi

echo "Compiling tool..."
# compile tool and prevent console output
./gradlew buildPlugin

PLUGIN_DIR="build/distributions"
XML_PATH="updates.xml"
PLUGIN_XML_PATH="src/main/resources/META-INF/plugin.xml"
BASE_URL="https://github.com/francis-agencemxo/Time-Tracker/raw/refs/heads/main/build/distributions"

# Get the latest .zip file
LATEST_ZIP=$(ls -t "$PLUGIN_DIR"/*.zip | head -n 1)
ZIP_FILENAME=$(basename "$LATEST_ZIP")

# Extract version from plugin.xml
VERSION=$(grep -oPm1 "(?<=<version>)[^<]+" "$PLUGIN_XML_PATH")

# Create the new XML
cat > "$XML_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<plugins>
    <plugin
            id="com.mxo.timetracker"
            url="${BASE_URL}/${ZIP_FILENAME}"
            version="${VERSION}">
        <name>MXO Time Tracker</name>
        <vendor>MXO</vendor>
        <description>
            <![CDATA[
                Internal plugin by MXO.<br /><br />
                Features:
                <ul>
                    <li>Logs Project working times Locally</li>
                </ul>
            ]]>
        </description>
        <idea-version since-build="193.0" until-build="241.*"/>
    </plugin>
</plugins>
EOF

echo "✅ updates.xml generated with version $VERSION and zip $ZIP_FILENAME"
exit;
echo "Tagged new release: $VERSION"

echo "Uploading new version to DEV server..."

# Define variables
REMOTE_PATH_ZIP="/home/dev/www/mxo-utils/phpStormPlugins/$ZIP_FILENAME"
REMOTE_PATH_UPDATES="/home/dev/www/mxo-utils/phpStormPlugins/updates.xml"
SSH_KEY_FILE="$HOME/.ssh/id_rsa.pub"

# Check if the SSH public key file exists
if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "SSH public key not found at $SSH_KEY_FILE"
    exit 1
fi

# Extract the SSH public key
SSH_KEY_CONTENT=$(cat "$SSH_KEY_FILE")

# Check if the key exists on the remote server
ssh "$REMOTE_USER@$REMOTE_HOST" "grep -qF '$SSH_KEY_CONTENT' ~/.ssh/authorized_keys"

if [ $? -eq 0 ]; then
    echo "✅ SSH key is already added to $REMOTE_HOST"
else
    echo "⚠️ SSH key is NOT found on $REMOTE_HOST"
    ssh-copy-id "$REMOTE_USER@$REMOTE_HOST"
fi

# Upload via SCP
scp "$LATEST_ZIP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH_ZIP"
scp "$XML_PATH" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH_UPDATES"

if [ $? -eq 0 ]; then
    echo "Upload successful!"
else
    echo "Upload failed!"
    exit 1
fi