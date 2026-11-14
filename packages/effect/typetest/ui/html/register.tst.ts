// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
import { Schema } from "effect"
import { Component, type View } from "effect/ui"
import type { Html } from "effect/ui/html"
import { describe, expect, it } from "tstyche"

describe("effect/ui/html/register", () => {
  it("declares Html as the registered vocabulary", () => {
    expect<View.Registered>().type.toBe<Html.Elements>()
  })

  it("gives a component without `elements` the HTML tags", () => {
    Component.define({
      name: "Greeting",
      model: Schema.Struct({}),
      message: Schema.Never
    }).make({
      init: () => ({}),
      update: (model) => model,
      view: (_, h) => {
        expect(h.p).type.toBe<Html.Tags<never>["p"]>()
        return h.p("Hello")
      }
    })
  })
})
