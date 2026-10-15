# JanPratinidhi — Local Standalone

This is the JanPratinidhi frontend separated from Replit. It runs locally with standard Node.js and npm.

## Requirements
- Node.js 20+ recommended
- npm 10+

## Run

```powershell
npm install
npm run dev
```

Open **http://localhost:5173**.

Do not use VS Code's **Go Live** button. This is a Vite/React application and must be started with `npm run dev`.

## Production build

```powershell
npm run build
npm run preview
```

## Notes
- The current UI uses the bundled demo data from `src/data.ts`.
- The original Replit workspace, Replit plugins, pnpm workspace, `.npmrc`, `.replit`, and workspace package references are intentionally not included.
- The API-dependent screens gracefully fall back to demo/unavailable states so the UI does not require a backend just to run.
- A local API/database can be added later without changing the overall UI structure.
