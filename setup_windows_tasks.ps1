# George SNS Automation - Windows Task Scheduler Setup Script
# This script creates scheduled tasks for automatic SNS posting

$ProjectDir = "H:\マイドライブ\ジョージ\SNS自動化app\sns_marketing_automation"

# Task 1: Daily Cycle at 20:00
$taskName1 = "George_DailyCycle"
$action1 = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ProjectDir\run_daily_cycle.bat`"" -WorkingDirectory $ProjectDir
$trigger1 = New-ScheduledTaskTrigger -Daily -At "20:00"
$settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Remove existing task if exists
Unregister-ScheduledTask -TaskName $taskName1 -Confirm:$false -ErrorAction SilentlyContinue

# Create new task
Register-ScheduledTask -TaskName $taskName1 -Action $action1 -Trigger $trigger1 -Settings $settings1 -Description "George SNS Daily Cycle - X and NOTE automatic posting at 20:00"

Write-Host "Created task: $taskName1" -ForegroundColor Green

# Task 2: Fragment Post at 12:00
$taskName2 = "George_FragmentPost"
$action2 = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ProjectDir\run_fragment_post.bat`"" -WorkingDirectory $ProjectDir
$trigger2 = New-ScheduledTaskTrigger -Daily -At "12:00"
$settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Remove existing task if exists
Unregister-ScheduledTask -TaskName $taskName2 -Confirm:$false -ErrorAction SilentlyContinue

# Create new task
Register-ScheduledTask -TaskName $taskName2 -Action $action2 -Trigger $trigger2 -Settings $settings2 -Description "George SNS Fragment Post - Light content at 12:00"

Write-Host "Created task: $taskName2" -ForegroundColor Green

Write-Host "`nAll tasks created successfully!" -ForegroundColor Cyan
Write-Host "You can view them in Task Scheduler (taskschd.msc)" -ForegroundColor Cyan
