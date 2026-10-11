# Architecture rules
- Keep independent theme and accent overrides in ThemeContext, using account-scoped local storage; this keeps live CSS tokens consistent without changing server-side profile contracts.
- Reserve bottom-dock space with the global app-dock-space token for primary content, fixed app views, and music overlays so navigation does not obscure controls.