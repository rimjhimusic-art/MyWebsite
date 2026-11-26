#!/usr/bin/env bash
set -euo pipefail

LABEL="com.onetabmedia.autopush"
PROJECT_DIR="/Users/anupambhowmick/Desktop/Web"
NODE_BIN="/Users/anupambhowmick/.local/node/bin/node"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$PROJECT_DIR/.autopush"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
chmod 700 "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${PROJECT_DIR}/scripts/autopush/daemon.mjs</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/Users/anupambhowmick/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launchd.err.log</string>
</dict>
</plist>
EOF

chmod 644 "$PLIST_PATH"
UID_VAL="$(id -u)"

# Cleanly bootout any existing agent first to prevent duplicate instances
launchctl bootout "gui/${UID_VAL}/${LABEL}" 2>/dev/null || launchctl unload -w "$PLIST_PATH" 2>/dev/null || true
launchctl bootstrap "gui/${UID_VAL}" "$PLIST_PATH" 2>/dev/null || launchctl load -w "$PLIST_PATH"
launchctl kickstart -k "gui/${UID_VAL}/${LABEL}" 2>/dev/null || true

echo "Installed and started LaunchAgent: $PLIST_PATH"
launchctl print "gui/${UID_VAL}/${LABEL}" | grep -E "state =|pid =|program =" || true
