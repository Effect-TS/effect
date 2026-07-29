---
"@effect/docgen": minor
"@effect/workspace": minor
---

Add workspace-wide semantic documentation compilation and validation with package and source-path filters. Markdown documentation and source-backed TypeScript examples share one semantic model. Docgen now requires Node.js 20.19+, 22.12+, or 24+.

Add explicit source and declaration frontends. Both compile package public entrypoints into the same renderer-independent semantic model, with declaration-map source locations and declaration-file fallback provenance.

Add `--json <file>` to write the renderer-independent semantic model for external documentation renderers.

Docgen no longer invokes TypeScript or Vitest and no longer generates validation configuration or intermediate example files. A checked-in Vitest configuration executes examples directly from source through virtual modules.
