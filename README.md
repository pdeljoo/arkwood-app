# Arcwood Millwork — PDF Analyzer

React + Vite app for extracting cabinet takeoffs from architectural PDFs.

## How it works
- Upload an architectural PDF and pick the elevation pages.
- The app slices only the selected pages (keeping the text layer intact) and sends
  that small PDF to the Python backend, which reads cabinet dimensions directly
  from the PDF vectors (95%+ accuracy).

## Backend
Set the backend URL in the app's ⚙️ Backend Settings:
`https://arcwood-backend.vercel.app`

## AI features (optional, off by default)
Page auto-detection, live pricing, and AI fallback are routed through a single
`callAI()` function in `src/MillworkPDFEditor.jsx`. They are disabled in this
build (`AI_ENABLED = false`). To enable later: deploy a proxy that holds the
Anthropic API key, set `AI_PROXY_URL` to its address, and flip `AI_ENABLED` to true.

## Develop
```
npm install
npm run dev
```

## Build
```
npm run build
```
