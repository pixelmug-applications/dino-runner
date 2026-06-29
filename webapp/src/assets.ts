import loadingIcon from './app-assets/loading-icon-transparent.png';
import styleBase from './app-assets/style-base.gif';
import styleSquare from './app-assets/style-square.png';
import type { TimerStyle } from './types';

export const LOADING_IMAGE = loadingIcon;

const styleSpinner =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16" shape-rendering="crispEdges"><rect width="32" height="16" fill="#101827"/><rect x="16" y="2" width="2" height="2" fill="#f8fafc"/><rect x="20" y="4" width="2" height="2" fill="#facc15"/><rect x="22" y="8" width="2" height="2" fill="#38bdf8"/><rect x="20" y="12" width="2" height="2" fill="#22c55e"/><rect x="16" y="14" width="2" height="2" fill="#64748b"/><rect x="12" y="12" width="2" height="2" fill="#334155"/><rect x="10" y="8" width="2" height="2" fill="#1e293b"/><rect x="12" y="4" width="2" height="2" fill="#0f172a"/><rect x="16" y="8" width="1" height="1" fill="#94a3b8"/></svg>',
  );

export const STYLE_ASSETS: Record<TimerStyle, string> = {
  radar: styleSquare,
  progress: styleBase,
  spinner: styleSpinner,
};
