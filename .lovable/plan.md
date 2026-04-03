
## Emulator Save File Manager

### Database
- New `emulator_saves` table: `id`, `user_id`, `game_name`, `save_name`, `file_path`, `file_size`, `thumbnail_url` (from ROM library match), `console`, `created_at`, `updated_at`
- New `emulator-saves` storage bucket for the actual save files
- RPC functions: `create_emulator_save`, `delete_emulator_save`, `get_my_emulator_saves` (all session-token based)

### UI — Save Manager Tab
- Add a **"Saves"** tab to the emulator alongside "ROM Library" and "Load ROM"
- Card-based layout inspired by the uploaded image: dark cards with game thumbnails, save name, date, and file size
- **Upload flow**: User picks a save file → selects which game (searchable dropdown of ROM library + manual entry) → enters a save name → uploads
- **Download**: One-click download button on each save card
- **Delete**: Delete button with confirmation
- "Latest Saves" section at the top showing recent saves
- Game thumbnail auto-populates from ROM library when a game is selected

### Files to create/modify
1. **Migration**: `emulator_saves` table + storage bucket + RPC functions
2. **New component**: `src/components/emulator/SaveManager.tsx`
3. **Edit**: `src/components/RetroArchPlayer.tsx` — add "Saves" tab

### No UI overhaul yet — just adding the save system first as requested
