---
"@effect/docgen": minor
"@effect/workspace": minor
---

Add workspace-wide semantic documentation compilation and validation with package and source-path filters. Markdown documentation and package-local TypeScript examples are independent projections of one semantic model. Docgen now requires Node.js 20.19+, 22.12+, or 24+.

Add explicit source and declaration frontends. Both compile package public entrypoints into the same renderer-independent semantic model, with declaration-map source locations and declaration-file fallback provenance.

Add `--json <file>` to write the renderer-independent semantic model for external documentation renderers.

Docgen no longer invokes TypeScript or Vitest and no longer generates validation configuration. Generated package examples remain available for manual editing, typechecking, and runtime execution through checked-in project configuration until the next docgen run refreshes them.
