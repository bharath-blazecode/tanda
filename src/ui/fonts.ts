// Self-hosted faces. Import this once, from the app entry, after the packages are installed:
//
//   npm i @fontsource/big-shoulders-display @fontsource/courier-prime
//   // then in src/main.tsx:  import './ui/fonts'
//
// DESIGN.md: "Serve both faces from our own origin. The app must not depend on a
// third-party host on mobile data."
//
// Kept out of ui/index.ts on purpose, so the kit compiles before the packages land.

import '@fontsource/big-shoulders-display/700.css';
import '@fontsource/big-shoulders-display/900.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
