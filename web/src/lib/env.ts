/**
 * When true, unconfigured contact details render as visible "Add … in
 * src/data/site.ts" hints instead of being hidden. On automatically in
 * `npm run dev`; set VITE_SHOW_PLACEHOLDERS=true to see them in a build.
 */
export const showPlaceholders: boolean =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_PLACEHOLDERS === 'true'
