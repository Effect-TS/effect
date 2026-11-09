---
"effect": patch
"@effect/ui-html": patch
---

Add `effect/ui`, a Layer-composed frontend framework for Effect, and `@effect/ui-html`, its HTML package.

This first step holds the host-agnostic core definitions: `Component`, `Command`, `Subscription`, `Feature` and the core `View` nodes, plus `Story` in `effect/ui/testing` for pure, one-instance tests. The modules are experimental.

```ts
import { Schema } from "effect"
import { Component } from "effect/ui"
import { Story } from "effect/ui/testing"

const Message = Schema.TaggedUnion({ Increment: {}, Decrement: {} })

const Counter = Component.make({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: Message,
  init: () => ({ count: 0 }),
  update: (model, message) =>
    Message.match(message, {
      Increment: () => ({ count: model.count + 1 }),
      Decrement: () => ({ count: model.count - 1 })
    }),
  view: (model, h) =>
    h.el("div", h.el("button", "+").on("click", Message.make({ _tag: "Increment" })), String(model.count))
})

Story.make(
  Counter,
  {},
  Story.click("+"),
  Story.model((model) => {
    if (model.count !== 1) throw new Error("expected 1")
  })
)
```
