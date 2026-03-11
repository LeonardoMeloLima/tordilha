

## Plan: Reorganize Header Layout

Move the logo to the left side of the header (same line as the bell and search icons), remove the logo's background, and place everything on a single top row.

### Changes in `src/pages/Index.tsx`

Replace the current header structure (logo centered on its own row, then greeting + icons row) with:

1. **Single top row**: Logo on the left, search + bell icons on the right — all on the same line
2. **Remove the `mb-3` centered logo container**
3. **Move the greeting ("Bem-vindo de volta" + role name) below this row**
4. **Add `mix-blend-multiply` or make the logo background transparent** via CSS (the PNG likely has a white/light background — using `mix-blend-multiply` will visually remove it)

Result:
```text
┌─────────────────────────────────┐
│ [Logo]              [🔍] [🔔]  │
│ Bem-vindo de volta              │
│ Olá, Gestor 👋                  │
│ [Gestor] [Professor] [Pais]    │
└─────────────────────────────────┘
```

