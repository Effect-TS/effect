import { BrowserHost, Html } from "@effect/ui-html"
import { Effect, Schema } from "effect"
import { Component } from "effect/ui"

const Message = Schema.TaggedUnion({ Increment: {} })

const Counter = Component.make({
  name: "Counter",
  model: Schema.Number,
  message: Message,
  elements: Html,
  init: () => 0,
  update: (count) => count + 1,
  view: (count, h) => h.button(String(count)).onClick(Message.make({ _tag: "Increment" }))
})

const main = BrowserHost.mount(Counter, {}, document.getElementById("app")!).pipe(
  Effect.andThen(Effect.never),
  Effect.scoped
)