---
"effect": patch
---

Let an `effect/ui` handler cancel the browser's default with `{ preventDefault: true }`, only when it produces a message. `Story` reports `defaultPrevented`, and the `effect/ui/html` key payload adds `composing`.
