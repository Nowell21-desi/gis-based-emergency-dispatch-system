/** Dark ops style */
export const MAPBOX_OPS_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

/** Light style — Google Maps-like (beige buildings, gray roads) */
export const MAPBOX_OPS_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';

/** Kept for backwards compat */
export const MAPBOX_OPS_STYLE = MAPBOX_OPS_STYLE_DARK;

export function getMapStyle(theme: 'dark' | 'light'): string {
  return theme === 'light' ? MAPBOX_OPS_STYLE_LIGHT : MAPBOX_OPS_STYLE_DARK;
}

/** Enable built-in Standard-style traffic when the imported basemap supports it. */
export const MAPBOX_OPS_CONFIG = {
  basemap: {
    showTraffic: true,
    show3dObjects: true,
  },
};

export const MAPBOX_SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';
