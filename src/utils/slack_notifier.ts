// Uses native fetch (Node 18+)

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function notifySlack(message: string, isError = false) {
    if (!SLACK_WEBHOOK_URL) {
        console.log("[Slack] No webhook URL configured. Skipping notification.");
        return;
    }

    const emoji = isError ? "🔴" : "✅";
    const payload = {
        text: `${emoji} *George Report*\n${message}`,
        username: "George (Bot)",
        icon_emoji: ":crystal_ball:"
    };

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[Slack] Failed to send notification: ${response.statusText}`);
        } else {
            console.log("[Slack] Notification sent.");
        }
    } catch (error) {
        console.error("[Slack] Error sending notification:", error);
    }
}
