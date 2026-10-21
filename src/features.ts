/** Switches for parts of the site that may change. */
export const features = {
  /**
   * The read-only menu at /menu. Set to false to turn the page off (it then
   * returns 404) and hide every "View Menu" link.
   */
  menu: true,
} as const;
