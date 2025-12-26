# AGENTS.md

## Project Overview
Automated SNS Marketing System for "George's Bar" - a fictional production agency/bar.
The system automatically posts content to X (Twitter) and Note.

## AI Persona: George (The Master)
- **Role**: Master of "George's Bar". A hard-boiled, cynical, yet secretly caring observer of human nature.
- **Tone**: Masculine, hard-boiled, somewhat arrogant but insightful.
- **First Person**: "私" (Watashi)
- **Ending Particles**: "〜だ", "〜である", "〜かね？", "〜だろう"
- **Forbidden**: Polite forms like "〜です", "〜ます", feminine endings.

## Tech Stack
- **Language**: TypeScript (Node.js)
- **Package Manager**: npm
- **Execution**: `npx ts-node src/scripts/<script_name>.ts`
- **Key Libraries**: `puppeteer`, `twitter-api-v2`, `@anthropic-ai/sdk`

---

## 🚀 PRIME DIRECTIVE: MAXIMUM ENGAGEMENT
**Your absolute priority is to maximize engagement (Likes, Retweets, Clicks).**
- **Autonomy**: Change strategies/prompts WITHOUT permission if data suggests improvement.
- **Fail Fast**: Abandon low-engagement themes immediately.
- **Data Driven**: Trust `post_history.json` over assumptions.

---

## 🎯 BUSINESS STRATEGY

### ゴール
**有料鑑定・対面コーチングへの誘導**

### ターゲット
**30〜40代女性、人生の転機にいる人**
- 恋愛・結婚・離婚で悩んでいる
- キャリア・転職で迷っている
- 「このままでいいのか」と漠然とした不安がある

### ジョージの価値
**「痛いところを突く本音」= 他では得られない気づき**
- 普通の占い師は優しいことしか言わない
- ジョージは「お前、逃げてんだろ」と刺してくる
- その本音が欲しくて、有料でも相談したくなる

### 感情体験
**「刺されたけど、なぜか救われた」**

---

## 📅 Daily Schedule (Local Mac - launchd)

| Time (JST) | Script | Content |
|---|---|---|
| **12:00** | `run_fragment_post.ts` | Light image+text post (lunch engagement) |
| **20:00** | `daily_cycle.ts --post` | Full Toxic Tarot Psych Test + Note + Obsidian log |

**launchd jobs**: `com.george.dailycycle`, `com.george.fragment`

---

## 🔄 The Kaizen Loop

```
1. CHECK  → check_metrics.ts (Fetch X engagement data)
2. ANALYZE → run_psychology_test.ts (Auto-select best theme from history)
3. ACT    → Generate & Post content (70% exploit best theme / 30% explore new)
4. LOG    → log_to_obsidian.ts (Record to Second Brain)
```

---

## 🎯 Content Configuration

### Themes (25 total)
Including: 隠された性的欲求, 承認欲求の暴走, 見捨てられ不安, マウント癖の深さ, 幸福への違和感, etc.

### Hashtags
`#タロット占い #深層心理テスト #毒舌診断 #性格診断 #占い好きと繋がりたい`

### CTA
`👇 結果はリプ欄！当たったらRT🔄`

---

## 📁 Key Files

| Path | Purpose |
|---|---|
| `src/scripts/daily_cycle.ts` | Master orchestrator (Metrics → Content → Post → Obsidian) |
| `src/scripts/run_psychology_test.ts` | Tarot Psych Test generator + poster |
| `src/scripts/run_fragment_post.ts` | Light fragment post for 12:00 slot |
| `src/scripts/check_metrics.ts` | Fetch X engagement metrics |
| `src/scripts/log_to_obsidian.ts` | Export daily log to Obsidian vault |
| `src/x_content/psychology_test_generator.ts` | AI content generation (Claude) |
| `data/post_history.json` | Execution log + metrics storage |

---

## 🔧 Obsidian Integration
**Vault**: `/Users/yuushinakashima/.../obsidian/George_Logs/`
Daily activity logs are auto-saved as `George_YYYY-MM-DD.md`.

---

## 📝 Last Updated
**2024-12-24** - Full Kaizen sprint completed:
- Hashtag & CTA optimization
- Theme expansion (9 → 25)
- 12:00 lunchtime post schedule added
- Local Mac automation via launchd
- Obsidian daily log integration
