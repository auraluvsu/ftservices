# ftservices

React + Vite + Tailwind CSS (v4) site for FT Services.

## Commands

- `npm run dev` – start the Vite dev server
- `npm run build` – production build
- `npm run preview` – preview the production build
- `npm run format` – format with oxfmt

## Structure

- `src/main.tsx` – entrypoint; mounts `App` and imports `src/index.css`
- `src/App.tsx` – main application component
- `src/index.css` – global CSS and Tailwind import
- `index.html` – Vite HTML shell (favicon: `public/image_c0ba5da2.ico`)
- `vite.config.ts` – React + Tailwind plugins, `@` alias for `src`

## Styling

Tailwind CSS v4 via `@tailwindcss/vite`; no Tailwind or PostCSS config file needed. Put global element styles in `@layer base { ... }` so utilities still override them.
