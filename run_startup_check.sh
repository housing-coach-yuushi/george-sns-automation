#!/bin/zsh

# George Startup Check Runner
# Runs on login to check if today's post is missing.

PROJECT_DIR="/Users/yuushinakashima/Library/CloudStorage/GoogleDrive-yuushi226@gmail.com/マイドライブ/ジョージ/SNS自動化app/sns_marketing_automation"

cd "$PROJECT_DIR" || exit 1

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

LOG_FILE="$PROJECT_DIR/logs/startup_$(date +%Y-%m-%d).log"
mkdir -p "$PROJECT_DIR/logs"

echo "=== George Startup Check - $(date) ===" >> "$LOG_FILE" 2>&1

/usr/local/bin/npx ts-node src/scripts/startup_check.ts >> "$LOG_FILE" 2>&1

echo "=== Finished - $(date) ===" >> "$LOG_FILE" 2>&1
