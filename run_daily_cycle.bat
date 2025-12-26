@echo off
chcp 65001 > nul
REM George Daily Cycle Runner for Windows
REM This script is called by Task Scheduler to execute the daily automation cycle.

REM Set project directory
set "PROJECT_DIR=H:\マイドライブ\ジョージ\SNS自動化app\sns_marketing_automation"

REM Change to project directory
pushd "%PROJECT_DIR%"
if errorlevel 1 (
    echo Failed to change directory to %PROJECT_DIR%
    exit /b 1
)

REM Create logs directory if not exists
if not exist "logs" mkdir logs

REM Get date in YYYY-MM-DD format (locale-independent)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "datetime=%%I"
set "DATESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%"

REM Set log file path
set "LOG_FILE=logs\daily_%DATESTAMP%.log"

echo === George Daily Cycle - %DATESTAMP% %time% === >> "%LOG_FILE%" 2>&1

REM Execute the daily cycle using node directly with ts-node from node_modules
node node_modules\ts-node\dist\bin.js src/scripts/daily_cycle.ts --post >> "%LOG_FILE%" 2>&1

echo === Cycle Finished - %DATESTAMP% %time% === >> "%LOG_FILE%" 2>&1

popd
