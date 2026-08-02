/**
 * App mark as a data URL so QR codes can embed it (and PNG export stays self-contained).
 * Keep in sync with /public/favicon.svg.
 */
const APP_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0A0A0A"/>
  <g fill="#FFFFFF">
    <path d="M 257 146 A 110 110 0 1 0 257 366 L 257 320 A 64 64 0 1 1 257 192 Z"/>
    <rect x="281" y="192" width="26" height="128" rx="6"/>
    <rect x="281" y="192" width="84" height="26" rx="6"/>
    <rect x="281" y="243" width="66" height="24" rx="6"/>
  </g>
</svg>
`.trim()

export const APP_ICON_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(APP_ICON_SVG)}`
