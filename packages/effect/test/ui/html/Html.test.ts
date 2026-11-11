import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component } from "effect/ui"
import { Html, HtmlServer } from "effect/ui/html"

const button = () => new Html.Element("button", [])

describe("Html", () => {
  describe("classNames", () => {
    it("joins tokens with one space", () => {
      assert.strictEqual(Html.classNames("rounded px-3", "py-1"), "rounded px-3 py-1")
    })

    it("skips false, null, undefined and empty tokens", () => {
      assert.strictEqual(Html.classNames(false, "a", null, "", undefined, "b"), "a b")
    })

    it("returns an empty string when no token is left", () => {
      assert.strictEqual(Html.classNames(), "")
      assert.strictEqual(Html.classNames(false, null, undefined, ""), "")
    })
  })

  describe("Element.class", () => {
    it("still takes a single string", () => {
      assert.deepStrictEqual(button().class("primary").attrs, { class: "primary" })
    })

    it("joins several tokens and drops the falsy ones", () => {
      const saving = true
      const error: string | undefined = undefined
      const element = button().class("rounded px-3 py-1", saving && "opacity-50", error !== undefined && "ring-2")
      assert.deepStrictEqual(element.attrs, { class: "rounded px-3 py-1 opacity-50" })
    })

    it("removes the attribute when every token is falsy", () => {
      assert.deepStrictEqual(button().class(false, null, undefined, "").attrs, {})
      assert.deepStrictEqual(button().class("primary").class(false).attrs, {})
    })

    it.effect("renders the same classes on the server", () =>
      Effect.gen(function*() {
        const Classes = Component.make({
          name: "Classes",
          model: Schema.Struct({ saving: Schema.Boolean }),
          message: Schema.Never,
          elements: Html,
          init: () => ({ saving: false }),
          update: (model) => model,
          view: (model, h) =>
            h.div(
              h.button("Save").class("rounded", model.saving && "opacity-50", "px-3"),
              h.p("Idle").class(model.saving && "busy")
            )
        })
        const rendered = yield* HtmlServer.renderToHtml(Classes, {})
        assert.include(rendered.html, `<button class="rounded px-3">Save</button>`)
        assert.include(rendered.html, "<p>Idle</p>")
      }))
  })
})
