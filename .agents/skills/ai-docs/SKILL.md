---
name: ai-docs
description: AI documentation. Use when authoring ai-docs/src or regenerating LLMS.md.
---

Treat `ai-docs/README.md` as the source of truth for style and source-file
conventions.

## Workflow

1. Inspect neighboring source examples and the relevant current `LLMS.md`
   output.
2. Read `ai-docs/README.md` before editing.
3. Edit sources under `ai-docs/src`; do not hand-edit generated `LLMS.md`
   sections.
4. Run `pnpm ai-docgen` and inspect the generated diff for ordering, missing
   content, and unrelated output changes.
5. Run every applicable check in the root `AGENTS.md` validation matrix.

The task is complete when the source is updated, `LLMS.md` is regenerated and
its diff reviewed, TypeScript checks pass when examples or fixtures changed,
formatting passes, and no changeset was added for AI-documentation-only work.
