import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component, View } from "effect/ui"
import { Html, HtmlServer } from "effect/ui/html"

// Runs in the default node environment: there is no DOM here.
describe("effect/ui/html/register", () => {
  it.effect("registers Html when imported, without a DOM", () =>
    Effect.gen(function*() {
      assert.isFalse("document" in globalThis)
      // Importing `effect/ui/html` registers nothing.
      assert.strictEqual(View.registeredElements(), undefined)

      yield* Effect.promise(() => import("effect/ui/html/register"))
      assert.strictEqual(View.registeredElements(), Html)

      const Greeting = Component.make({
        name: "Greeting",
        model: Schema.Struct({}),
        message: Schema.Never,
        init: () => ({}),
        update: (model) => model,
        view: (_, h) => h.p("Hello")
      })
      const rendered = yield* HtmlServer.renderToHtml(Greeting, {})
      assert.include(rendered.html, "<p>Hello</p>")
    }))
})
