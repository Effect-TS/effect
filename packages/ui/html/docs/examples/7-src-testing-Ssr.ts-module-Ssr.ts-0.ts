import { ssr } from "@effect/ui-html/testing"
import { Effect, Schema } from "effect"
import { Component, Head } from "effect/ui"

const App = Component.make({
  name: "App",
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Home")],
  view: (_, h) => h.el("h1", "Home")
})

const test = Effect.gen(function*() {
  const result = yield* ssr(App, {})
  return result.adopted // ["/App"]
}).pipe(Effect.scoped)