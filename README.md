# OpenReel

Desktop media player UI. React 18 + TypeScript + Vite + Tailwind v4.

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Stack

- **React 18** — function components, hooks, context for player state.
- **TypeScript** — `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- **Vite 5** with `@vitejs/plugin-react`.
- **Tailwind v4** via `@tailwindcss/vite`. No `tailwind.config.js`; design tokens live in `src/styles.css` inside `@theme`, utilities are generated from those tokens, and component primitives are declared with `@utility`.

## Layout

```text
src/
├── main.tsx          # entry
├── App.tsx           # shell composition
├── styles.css        # @theme tokens + base + @utility primitives
├── player.tsx        # player context (state + scene switcher)
├── ui.tsx            # Button, IconButton, Chip, Switch, Seg, Field, Bar, Menu, Modal, Toasts
├── shell.tsx         # TitleBar, Sidebar, StatusStrip
├── transport.tsx     # Transport bar, AdvancedRow, QueuePanel
├── data.ts           # demo data (media, recents, library, plugins, scenes)
├── types.ts          # shared types
├── lib/
│   ├── Icons.tsx     # icon set + Icon component
│   └── format.ts     # fmt(), clamp01, WAVE
└── views/
    ├── index.tsx     # route switch
    ├── Welcome.tsx
    ├── NowPlaying.tsx # empty / video / audio / error stages
    ├── OpenView.tsx
    ├── Library.tsx
    ├── Settings.tsx
    ├── Plugins.tsx
    ├── Shortcuts.tsx
    └── About.tsx
```

## Theming

Both themes are declared in `styles.css`:

- `@theme { --color-…: … }` — dark, default.
- `[data-theme="light"] { … }` — light, overrides the same names.

Tailwind v4 turns each `--color-x` into `bg-x`, `text-x`, `border-x`, etc. Toggling `data-theme` on `<html>` swaps the entire app with zero per-component theme code.

## Component primitives

Repeated patterns that can't be a single Tailwind class are declared with `@utility` in `styles.css` (`btn-base`, `chip-base`, `nav-base`, `row-base`, `animate-*`). They compose freely with Tailwind utility classes at the call site — e.g. `className="btn-base btn-hover bg-accent text-[#1a0f08]"`.

## Screens

The title bar has a **Screens** menu for design review. It flips the app through the spec's states (welcome, empty, video, audio, error, offline, settings, plugins, install modal, etc.). Remove `SCENES` and the menu before shipping.

## Type-checking

```bash
npm run typecheck
```

Runs `tsc --noEmit` against `src/`. Builds run it too (`tsc -b && vite build`).
