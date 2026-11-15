# Jude Truong — Portfolio

Interactive bedroom portfolio built with React, Vite, and Three.js.

## Local development

```sh
npm ci
npm run dev
```

## Production preview

```sh
npm run build
npm run preview
```

## GitHub Pages

1. Push this repository to GitHub with `main` as the default branch.
2. In Settings → Pages, set Source to **GitHub Actions**.
3. Run **Deploy portfolio to GitHub Pages** from the Actions tab, or push a commit to `main`.
4. Find the published URL in Settings → Pages or the completed workflow.

The workflow automatically sets Vite's base URL from GitHub Pages configuration, supporting project repositories and user sites. Local development stays at `/`.

Files in `public/`, including the resume PDF, room model, project images, and music, are included in the deployed site. `node_modules` and `dist` are ignored by Git.
