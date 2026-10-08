# 📊 AI CSV Report

CSV / Excel upload koro → **AI report + chart + statistics + data table** ek sathe paiye jao.
Dark/Light mode, fully responsive, password-protected.

**Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · Recharts · Gemini / Groq (free AI)

---

## ✨ Features

- 📄 CSV `.csv` **and** Excel `.xlsx` — duitai support
- 🔐 Password login (`.env` theke set hoy, default `0000`)
- 🌓 Dark / Light mode switch (localStorage-e save hoy)
- 📱 Fully responsive (mobile → desktop)
- 📈 Auto chart: line, bar, donut, scatter, histogram (Recharts)
- 📋 Column statistics (mean, median, min, max, std, unique, missing)
- 🤖 AI report: executive summary, insights, anomalies, recommendations
- 🗂️ Paginated data table
- 🖨️ Print / PDF download (browser print diye)
- ⚡ Chart fast ashhe, AI report alada load hoy (dui request parallel-e)

---

## 🚀 Local setup

```bash
cd C:\projects\ai_report
npm install
npm run dev
```

Browser-e khulo: **http://localhost:3000**
Password: **`0000`**

> Production test: `npm run build` pore `npm start`

---

## 🔑 Free AI key kivabe nibo

Site AI report lekhte **ekta key lagbei**. Duitai free:

### Option 1 — Google Gemini (recommended)

1. Jao → **https://aistudio.google.com/apikey**
2. Google account diye sign in koro
3. **"Create API Key"** click koro
4. Key copy koro
5. `.env.local` e boshao:

```
GEMINI_API_KEY=ter-key-ekhane
```

> Free limit: ~15 request/minute (project-e). Chat/report er jonno paryapt.

### Option 2 — Groq (khub fast)

1. Jao → **https://console.groq.com/keys**
2. Sign up koro (**card lagbe na**)
3. **Create API Key** → copy
4. `.env.local` e boshao:

```
GROQ_API_KEY=ter-key-ekhane
```

> Free limit: ~30 req/min, 14,400 req/day. Open-source models (Llama, GPT-OSS, Qwen).

### Provider switch

`.env.local` e:

```
AI_PROVIDER=gemini   # OR  groq
```

Jodi **dui-tai key** thake, `AI_PROVIDER` onujayi select hobe.
Shudhu ekta key thakle sheitai automatic use hobe.

---

## ⚙️ Environment variables

`.env.local` (local) / **Vercel → Settings → Environment Variables** (deploy):

| Variable | Ki | Default |
|---|---|---|
| `APP_PASSWORD` | Site login password | `0000` |
| `SESSION_SECRET` | Random string (session sign) | dev default |
| `AI_PROVIDER` | `gemini` ya `groq` | `gemini` |
| `GEMINI_API_KEY` | Gemini free key | — |
| `GEMINI_MODEL` | Gemini model | `gemini-3.5-flash` |
| `GROQ_API_KEY` | Groq free key | — |
| `GROQ_MODEL` | Groq model | `openai/gpt-oss-120b` |
| `REPORT_LANG` | `en` ya `bn` (Bangla report) | `en` |

> ⚠️ Production-e `APP_PASSWORD` ar `SESSION_SECRET` **nijer random value** diye change koro.
> `.env.local` git-e push hoy na (`.gitignore` e ache).

---

## ▲ Vercel deploy

1. Project ta **GitHub-e push** koro
2. Jao → **https://vercel.com/new** → repo import koro
3. Framework: **Next.js** (auto-detect hobe)
4. **Settings → Environment Variables** e ei gulo add koro:
   `APP_PASSWORD`, `SESSION_SECRET`, `AI_PROVIDER`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `REPORT_LANG`
5. **Deploy** click koro — shesh!

Deploy por `/login` e password, tarpor CSV upload.

> 💡 AI request 10s+ nite pare — Vercel-e function `maxDuration` already set kora ache (analyze 30s, insight 60s).

---

## 🗂️ Project structure

```
ai_report/
├── app/
│   ├── layout.js           # root layout + theme script (flash-free)
│   ├── globals.css         # Tailwind v4 + dark variant + print CSS
│   ├── page.js             # home (auth check → Dashboard)
│   ├── login/page.js       # login page (authed hole redirect)
│   └── api/
│       ├── login/route.js  # POST password → signed cookie
│       ├── logout/route.js # POST → cookie clear
│       ├── analyze/route.js# CSV → overview + profiles + charts + table
│       └── insight/route.js# CSV → AI report (alada, parallel-e chole)
├── components/
│   ├── Dashboard.js        # orchestrator (state + layout)
│   ├── LoginForm.js        # password form
│   ├── ThemeToggle.js      # dark/light switch
│   ├── UploadZone.js       # drag-drop + sample CSV
│   ├── OverviewCards.js    # stat cards
│   ├── AIInsight.js        # AI report section
│   ├── ChartsGrid.js       # Recharts renderer
│   ├── ColumnStats.js      # column statistics table
│   ├── DataTable.js        # raw rows + pagination
│   └── useDark.js          # theme hook (MutationObserver)
├── lib/
│   ├── auth.js             # HMAC signed cookie (Web Crypto)
│   ├── csv.js              # parse + type detect + stats
│   ├── excel.js            # .xlsx parse (exceljs, first sheet)
│   ├── charts.js           # auto chart builder (AI-independent)
│   ├── analyze.js          # shared analyze pipeline
│   └── ai.js               # Gemini + Groq (provider switch)
└── .env.local              # keys + password (git-ignored)
```

---

## 🔒 Auth kivabe kaj kore

- Password check hoy `APP_PASSWORD` diye (default `0000`)
- Shiroy HMAC-SHA256 signed **httpOnly cookie** (7 din)
- `page.js` ar protected API route-e verify hoy → na hole redirect / 401
- Kono database lagbe na (stateless)

---

## 🧪 Testing

- **Sample CSV** diye ek click-e test koro (upload zone-e button ache)
- `.xlsx` / `.xlsm` file o drop korte parbe (first worksheet use hoy)
- Purano `.xls` support na — `.xlsx` ba CSV te save koro
- File limit: ~3MB, 10,000 row analyze hoy (table-e 2000 porjonto dekhay)

---

## ❓ Common somossa

| Somossa | Solution |
|---|---|
| "No AI key set" dekhacche | `.env.local` e `GEMINI_API_KEY` boshao, server restart |
| `404 model no longer available` | `.env.local` e `GEMINI_MODEL=gemini-3.5-flash` (notun/preview model notun users-er jonno bondho thake) |
| `503 high demand` | Gemini free tier overload — code nijei alternate model try kore; abar click koro |
| AI report ashe ni | Key valid kina dekho; rate limit hoite pare |
| Bangla report chao | `.env.local` e `REPORT_LANG=bn` |
| Port occupied | `set PORT=3001 && npm start` |
| Deploy-e AI timeout | Vercel e `maxDuration` already 60s set |
