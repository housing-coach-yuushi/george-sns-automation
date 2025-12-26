#!/bin/zsh

# ============================================
# DISABLED: Moved to Windows PC (2024-12-25)
# This Mac automation is no longer active.
# ============================================
echo "This automation has been moved to Windows. Exiting."
exit 0

# George Daily Cycle Runner
# This script is called by launchd to execute the daily automation cycle.

# Load environment variables from .env if present
PROJECT_DIR="/Users/yuushinakashima/Library/CloudStorage/GoogleDrive-yuushi226@gmail.com/マイドライブ/ジョージ/SNS自動化app/sns_marketing_automation"

cd "$PROJECT_DIR" || exit 1

# Source .env file for secrets
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Log file for debugging
LOG_FILE="$PROJECT_DIR/logs/launchd_$(date +%Y-%m-%d).log"
mkdir -p "$PROJECT_DIR/logs"

echo "=== George Daily Cycle - $(date) ===" >> "$LOG_FILE" 2>&1

# Execute the daily cycle
/usr/local/bin/npx ts-node src/scripts/daily_cycle.ts --post >> "$LOG_FILE" 2>&1

echo "=== Cycle Finished - $(date) ===" >> "$LOG_FILE" 2>&1
