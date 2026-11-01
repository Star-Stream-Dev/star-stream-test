# Architecture rules
- Keep independent theme and accent overrides in ThemeContext, using account-scoped local storage; this keeps live CSS tokens consistent without changing server-side profile contracts.
- Fullscreen app views fill to the screen bottom (the FloatingDock overlays them); only scrolling page content reserves --app-dock-space so the dock never hides the last items.
- Keep main app dock controls in FloatingDock; CSS hover/focus reveals it for mouse users while touch devices retain visible controls for accessible navigation.- Free-layout home items use a fixed 1280px design canvas scaled to the viewport width, so layouts look identical on every screen size.
