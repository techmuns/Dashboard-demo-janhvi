# Munshot Leadership Workforce Dashboard

A live HR / management dashboard that fetches Key Managerial Personnel (KMP)
movements — appointments, resignations, terminations and retirements — for
any real listed company, on demand, via the MUNS agent API. Built with React,
Vite, Tailwind CSS, Recharts and Lucide React.

## Getting Started

```bash
npm install
npm run dev
```

The local development server will start with Vite and print the URL in the terminal.

## Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```text
.
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
├── vite.config.js
└── src
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    ├── components
    │   ├── AnalysisCard.jsx
    │   ├── AnalyticsChart.jsx
    │   ├── CompanySearch.jsx
    │   ├── EmployeeDetailDrawer.jsx
    │   ├── EmployeeTable.jsx
    │   ├── Header.jsx
    │   ├── KPICard.jsx
    │   ├── LoadingAnalysis.jsx
    │   ├── Sidebar.jsx
    │   └── StatusBadge.jsx
    ├── lib
    │   ├── agentConfig.js          // MUNS token + agent UUIDs
    │   ├── birdnest.js             // ticker / company search
    │   ├── liveCompany.js          // assembles a dashboard-shaped company from agent output
    │   ├── munsAgent.js            // /agents/run client
    │   ├── munsParse.js            // <ans> markdown-table parser
    │   ├── munsToKmpRows.js
    │   ├── munsToRecords.js        // fetches all 4 KMP agents in parallel
    │   └── recentCompanies.js      // last-5 LRU cache in localStorage
    └── utils
        └── dashboard.js
```

## How it works

1. Search a real listed company in the header — backed by the Birdnest
   stock-search endpoint.
2. The dashboard fans out four MUNS agents in parallel (appointments,
   resignations, terminations, retirements). Combined runtime is ~3 minutes,
   during which a progress overlay (`LoadingAnalysis`) keeps the tab live.
3. The parsed result drives the KPI cards, charts, employee tables and analysis
   cards directly — there is no mock data anywhere in the app.
4. The company plus its full result is cached in `localStorage` as a
   most-recently-used list of the last five companies. The **Companies** tab
   shows that list. Clicking a card reloads the cached snapshot instantly;
   the **Refresh** button on the card re-runs the agents.

The bearer token used by both endpoints is a single hardcoded export at
`src/lib/agentConfig.js` — swap it there when it expires.

## GitHub Action

`.github/workflows/munshot-fetch-all.yml` captures the raw responses for one
hardcoded company (currently JIOFIN) and commits them under `munshot-outputs/`.
Used only as a parser / sample-data source during development; the dashboard
runtime hits MUNS directly from the browser.
