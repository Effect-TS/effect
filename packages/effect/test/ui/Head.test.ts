import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Component, Head, type MessageLog } from "effect/ui"
import { TestHost } from "effect/ui/testing"

const node = (entries: ReadonlyArray<Head.Entry>, ...children: ReadonlyArray<Head.Tree>): Head.Tree => ({
  entries,
  children
})

describe("Head", () => {
  it("chains title templates outward, never on the instance's own title", () => {
    const app = (layout: Head.Tree) => node([Head.titleTemplate((t) => `${t} · App`), Head.title("App")], layout)
    const people = (...children: ReadonlyArray<Head.Tree>) =>
      node([Head.titleTemplate((t) => `${t} · People`), Head.title("People")], ...children)
    assert.strictEqual(Head.merge(app(people(node([Head.title("Ada")])))).title, "Ada · People · App")
    assert.strictEqual(Head.merge(app(people())).title, "People · App")
    assert.strictEqual(Head.merge(node([Head.titleTemplate((t) => `${t}!`), Head.title("Root")])).title, "Root")
  })

  it("lets the later entry win per identity, in document order", () => {
    const head = Head.merge(node(
      [
        Head.meta({ name: "description", content: "root" }),
        Head.link({ rel: "canonical", href: "/a" }),
        Head.lang("en")
      ],
      node([Head.meta({ name: "description", content: "first" }), Head.link({ rel: "canonical", href: "/b" })]),
      node([
        Head.meta({ name: "description", content: "second" }),
        Head.meta({ property: "og:title", content: "Ada" }),
        Head.link({ rel: "alternate", href: "/fr", hreflang: "fr" }),
        Head.link({ rel: "alternate", href: "/de", hreflang: "de" }),
        Head.lang("fr")
      ])
    ))
    assert.deepStrictEqual(head.meta.map((meta) => meta.content), ["second", "Ada"])
    assert.deepStrictEqual(head.links.map((link) => link.attributes.href), ["/b", "/fr", "/de"])
    assert.strictEqual(head.html.lang, "fr")
  })

  it("unions class tokens in order of first contribution and keeps one data slot per name", () => {
    const head = Head.merge(node(
      [Head.htmlClass("h-full  dark"), Head.bodyClass(["a b"]), Head.htmlData("data-theme", "light")],
      node([Head.htmlClass(["dark", "x"]), Head.htmlData("data-theme", "dark"), Head.bodyData("data-page", "")])
    ))
    assert.deepStrictEqual(head.html.class, ["h-full", "dark", "x"])
    assert.deepStrictEqual(head.body.class, ["a", "b"])
    assert.deepStrictEqual(head.html.data, { "data-theme": "dark" })
    assert.deepStrictEqual(head.body.data, { "data-page": "" })
  })

  it("rejects the marker as a data name", () => {
    assert.throws(() => Head.htmlData("data-eui" as any, "x"), /marker/)
  })

  it("serialises JSON-LD canonically and escapes <", () => {
    const a = Head.jsonLd({ b: 1, a: { d: [1, "x"], c: "</script>" }, z: undefined })
    const b = Head.jsonLd({ a: { c: "</script>", d: [1, "x"] }, b: 1 })
    assert.strictEqual(a.json, "{\"a\":{\"c\":\"\\u003c/script>\",\"d\":[1,\"x\"]},\"b\":1}")
    assert.strictEqual(a.json, b.json)
    const head = Head.merge(
      node([a], node([b]), node([Head.jsonLd({ b: 2 }, { key: "k" }), Head.jsonLd({ b: 3 }, { key: "k" })]))
    )
    assert.deepStrictEqual(head.jsonLd.map((entry) => entry.json), [a.json, "{\"b\":3}"])
  })

  it("reports what JSON can't hold, with its path", () => {
    assert.throws(() => Head.jsonLd({ a: { when: new Map() } } as any), /\$\.a\.when is a Map/)
    assert.throws(() => Head.jsonLd({ list: [1, Number.NaN] }), /\$\.list\[1\] is NaN/)
    assert.throws(() => Head.jsonLd([1] as any), /not an array/)
  })

  it("skips a throwing template and reports it to its node", () => {
    const errors: Array<unknown> = []
    const tree: Head.Tree = {
      entries: [Head.titleTemplate(() => {
        throw new Error("bad template")
      })],
      children: [node([Head.title("Ada")])],
      onError: (error) => errors.push(error)
    }
    assert.strictEqual(Head.merge(tree).title, "Ada")
    assert.strictEqual(errors.length, 1)
    assert.throws(() => Head.merge({ ...tree, onError: undefined }), /bad template/)
  })

  it.effect("fails only the instance whose title template throws", () =>
    Effect.gen(function*() {
      const Page = Component.define({
        name: "Page",
        model: Schema.Number,
        message: Schema.Never
      }).make({
        init: () => 0,
        update: (model) => model,
        head: () => [Head.title("Ada")],
        view: (_, h) => h.text("page")
      })
      const Layout = Component.define({
        name: "Layout",
        model: Schema.Number,
        message: Schema.Never
      }).make({
        init: () => 0,
        update: (model) => model,
        head: () => [
          Head.titleTemplate(() => {
            throw new Error("bad template")
          })
        ],
        view: (_, h) => h.child(Page, { key: "page", props: {} })
      })
      const App = Component.define({
        name: "App",
        model: Schema.Number,
        message: Schema.Never
      }).make({
        init: () => 0,
        update: (model) => model,
        head: () => [Head.title("App")],
        view: (_, h) => h.el("main", h.child(Layout, { key: "layout", props: {}, fallback: () => h.text("down") }))
      })
      const root = yield* TestHost.mount(App, {})
      yield* TestHost.settle
      assert.strictEqual(root.text(), "down")
      assert.strictEqual(root.head().title, "App")
      const failed = root.log().filter((entry): entry is MessageLog.Failed => entry._tag === "Failed")
      assert.deepStrictEqual(failed.map((entry) => [entry.path, entry.source]), [["/App/Layout[layout]", "head"]])
    }).pipe(Effect.provide(TestHost.layer())))

  it.effect("clears the head when the root's title template throws", () =>
    Effect.gen(function*() {
      const Page = Component.define({
        name: "Page",
        model: Schema.Number,
        message: Schema.Never
      }).make({
        init: () => 0,
        update: (model) => model,
        head: () => [Head.title("Ada")],
        view: (_, h) => h.text("page")
      })
      const App = Component.define({
        name: "App",
        model: Schema.Number,
        message: Schema.Never
      }).make({
        init: () => 0,
        update: (model) => model,
        head: () => [
          Head.lang("en"),
          Head.titleTemplate(() => {
            throw new Error("bad template")
          })
        ],
        view: (_, h) => h.child(Page, { key: "page", props: {} })
      })
      const root = yield* TestHost.mount(App, {}, { fallback: (_, h) => h.text("down") })
      const crashed = yield* Effect.flip(TestHost.settle)
      assert.strictEqual(crashed._tag, "RootCrashed")
      assert.strictEqual(root.text(), "down")
      // The failed root and the page under it contribute nothing.
      assert.strictEqual(root.head().title, undefined)
      assert.strictEqual(root.head().html.lang, undefined)
    }).pipe(Effect.provide(TestHost.layer())))
})
