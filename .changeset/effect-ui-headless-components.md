---
"effect": patch
---

Add headless components to `effect/ui`: a component with `parts` and no `view` keeps its own state and behavior, and the parent that renders it with `h.child(Menu, { key, view: (m) => ... })` writes all of its markup by applying the parts to its own elements. Child path segments now escape `%`, a name's `[`, and the `/` after a `]` in a key, so a key holding `]/` can no longer share a path with a grandchild.
