---
"effect": patch
---

Let an `effect/ui` parent send a one-shot message to a child. The child lists the tags it accepts with `receives`, the parent renders it with a ref (`h.child(Editor, { ref: Editor.ref("Draft") })`), and `update` calls `$.send(ref, message)`. A feature service declares `receives` as a Schema.

A parent that renders two children at the same path now fails instead of mounting both.
