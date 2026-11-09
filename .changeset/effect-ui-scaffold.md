---
"effect": patch
"@effect/ui-html": patch
---

Add `effect/ui`, a Layer-composed frontend framework for Effect, and `@effect/ui-html`, its HTML package.

The host-agnostic core holds `Component`, `Command`, `Subscription`, `Feature` and `View`, plus `Renderer` to mount a component tree on any host and `MessageLog` to record what it does. `effect/ui/testing` adds `Story` for one-instance tests, `TestHost` and `Query` for runtime tests, and `Story.fromLog` to replay a logged session. The modules are experimental.

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
