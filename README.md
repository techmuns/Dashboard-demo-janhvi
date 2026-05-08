# Munshot Leadership Workforce Dashboard

A polished HR and company management dashboard UI built with React, Vite, Tailwind CSS, Recharts, and Lucide React. The interface is designed for HR, management, and operations teams to monitor leadership lifecycle records across multiple companies using realistic mock data.

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
    │   ├── EmployeeTabs.jsx
    │   ├── Header.jsx
    │   ├── KPICard.jsx
    │   ├── Sidebar.jsx
    │   └── StatusBadge.jsx
    ├── data
    │   └── mockData.js
    └── utils
        └── dashboard.js
```

## Features

- Company selector with mock company switching
- Leadership KPI cards with month-over-month comparison text
- Recharts analytics for movement, status, functions, and attrition
- Four lifecycle tabs: appointments, terminations, resignations, retirements
- Search, department filter, location filter, chronological sorting, pagination, and empty states
- Leadership detail drawer with timeline and notes
- Dedicated leadership analysis section with professional management insights

## Mock Data

Mock data is stored in [`src/data/mockData.js`](./src/data/mockData.js). It includes leadership-only records for:

- Key managerial personnel
- Board-level executives
- CXOs and senior leadership
- Company secretary, compliance, finance, and governance roles

- 5 companies
- 8 appointment records per company
- 8 resignation records per company
- 8 termination records per company
- 8 retirement records per company
- department and month-level analytics derived from those records
