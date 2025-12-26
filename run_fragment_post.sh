#!/bin/zsh

# ============================================
# DISABLED: Moved to Windows PC (2024-12-25)
# This Mac automation is no longer active.
# ============================================
echo "This automation has been moved to Windows. Exiting."
exit 0

# George Fragment Post Runner (Lunchtime)
# Light content post for 12:00 engagement.

PROJECT_DIR="/Users/yuushinakashima/Library/CloudStorage/GoogleDrive-yuushi226@gmail.com/マイドライブ/ジョージ/SNS自動化app/sns_marketing_automation"

cd "$PROJECT_DIR" || exit 1

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

LOG_FILE="$PROJECT_DIR/logs/fragment_$(date +%Y-%m-%d).log"
mkdir -p "$PROJECT_DIR/logs"

echo "=== George Fragment Post - $(date) ===" >> "$LOG_FILE" 2>&1

/usr/local/bin/npx ts-node src/scripts/run_fragment_post.ts --post >> "$LOG_FILE" 2>&1

echo "=== Finished - $(date) ===" >> "$LOG_FILE" 2>&1
