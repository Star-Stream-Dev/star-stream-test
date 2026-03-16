

## RetroArch in SolarNova — Without an Iframe

### The Reality

After researching this thoroughly, **RetroArch/EmulatorJS cannot run directly inside a React SPA without an iframe**. The official EmulatorJS docs explicitly state this — it tampers with the DOM and will break single-page apps. Even the `react-emulatorjs` npm package uses an iframe internally (I checked its source code).

### Your Options

**Option A: `react-emulatorjs` (Recommended)**
This is an npm package that wraps EmulatorJS as a proper React component. It *does* use an iframe under the hood, but it's **not** linking to an external site — it renders the emulator inline as a self-contained component within your app. From the user's perspective, it looks and feels native. You get:
- A React component `<EmulatorJS core="snes" gameUrl="..." />`
- Full control over sizing, styling, theming
- Users load their own ROM files via a file picker
- Save states stored in browser IndexedDB
- Support for NES, SNES, GBA, Genesis, N64, PS1, and many more

**Option B: Individual Standalone Emulators**
Use dedicated per-console JS libraries that work natively in React without any iframe:
- `jsnes` for NES
- `gbajs` / `react-gbajs` for GBA
- etc.

This gives true no-iframe rendering but would be a **massive** effort — each console needs its own integration, and coverage is limited.

**Option C: New Tab/Window**
Open `web.libretro.com` in a new browser tab. Simple but disconnected from SolarNova.

### Recommendation

**Go with Option A** (`react-emulatorjs`). While it technically has an iframe internally, it's a self-contained React component — not linking to an external website. The emulator renders inside your app with your styling, and users interact with it like any other SolarNova feature.

### Implementation Plan (Option A)

1. **Install `react-emulatorjs`** npm package
2. **Create `RetroArchPlayer.tsx`** component with:
   - Console selector (NES, SNES, GBA, Genesis, N64, PS1, etc.)
   - ROM file picker (drag-and-drop or file input) — users provide their own ROMs
   - EmulatorJS component rendering the selected core + ROM
   - Controls info overlay showing keyboard/gamepad mappings
   - Fullscreen toggle
3. **Add "Emulator" section** to `Index.tsx` navigation with a gamepad icon
4. **Add to Desktop Environment** as a launchable app in `DESKTOP_APPS`
5. **No database changes needed** — ROMs are loaded from user's device, save states are stored in browser IndexedDB by EmulatorJS automatically

### Technical Notes

- ROM files stay client-side only — SolarNova never hosts or stores ROMs
- EmulatorJS loads its WASM cores from a CDN (`cdn.emulatorjs.org`)
- Save states persist automatically via IndexedDB
- ~3-4 files created/modified

