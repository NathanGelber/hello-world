# MatteWrite

A lightweight word processor prototype focused on ease of use, aesthetics, and simplicity.

## What it includes

- Easy tab management: new/close/reopen tabs, pinned tabs, and quick switching shortcuts.
- Curated typography with built-in presets and **custom font stack** support.
- **Color themes** limited to Cream and FT Pink (no white/gray themes).
- Calm editing surface with autosave and local session restore.
- Command palette (`Ctrl/Cmd+P`) to jump between open documents.

## Customize the font

- Choose a preset from the first font dropdown.
- Or type your own CSS font stack in **Custom font stack** and click **Apply font**.
- Example custom stack:

```text
"Avenir Next", "Inter", system-ui, sans-serif
```

If the first font is not installed, the browser falls back automatically to the next one.

## Keyboard shortcuts

- `Ctrl/Cmd+N`: New document tab
- `Ctrl/Cmd+W`: Close current tab
- `Ctrl/Cmd+Shift+T`: Reopen last closed tab
- `Ctrl/Cmd+P`: Command palette / quick switch
- `Ctrl/Cmd+1..9`: Jump to tab position

## Run

Because this is a static app, you can open `index.html` directly, or use a simple local server:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## If it looks different from the screenshot

This app saves appearance settings in `localStorage`. If you previously changed fonts/themes, your local run may not match screenshots.

- Click **Reset look** in the toolbar to return to the default screenshot style (FT Pink + Inter).
- Or clear site storage in your browser devtools and reload.
