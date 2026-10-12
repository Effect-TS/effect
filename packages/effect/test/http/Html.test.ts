import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Option } from "effect"
import { Html, HttpServerResponse } from "effect/http"

const text = <E, R>(html: Effect.Effect<Html.Html, E, R>) => Effect.map(html, (_) => _.value)

class Greeting extends Context.Service<Greeting, { readonly hello: string }>()("test/Greeting") {}

describe("Html", () => {
  describe("make", () => {
    it.effect("escapes script injected as text", () =>
      Effect.gen(function*() {
        assert.strictEqual(
          yield* text(Html.make`<p>${"<script>alert(1)</script>"}</p>`),
          "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
        )
      }))

    it.effect("escapes a quoted attribute value, so it cannot end the attribute or the tag", () =>
      Effect.gen(function*() {
        const attack = "\"><script>alert(1)</script>"
        const markup = yield* text(Html.make`<a title="${attack}" href='${attack}'>x</a>`)
        assert.strictEqual(
          markup,
          "<a title=\"&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;\" href='&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'>x</a>"
        )
        assert.isFalse(markup.includes("<script>"))
      }))

    it.effect("escapes every entity character, and an entity that is already written", () =>
      Effect.gen(function*() {
        assert.strictEqual(
          yield* text(Html.make`${"&<>\"'"} ${"&amp;"}`),
          "&amp;&lt;&gt;&quot;&#39; &amp;amp;"
        )
      }))

    it.effect("renders numbers and booleans, and nothing for null and undefined", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* text(Html.make`[${1}${2n}${true}${null}${undefined}]`), "[12true]")
      }))

    it.effect("inserts Html as it is, and escapes the text inside it once", () =>
      Effect.gen(function*() {
        const name = (value: string) => Html.make`<b title="${value}">${value}</b>`
        const card = (value: string) => Html.make`<section>${name(value)}</section>`
        const nested = yield* Effect.flatMap(card("\"><i>"), (html) => text(Html.make`<main>${html}</main>`))
        assert.strictEqual(
          nested,
          "<main><section><b title=\"&quot;&gt;&lt;i&gt;\">&quot;&gt;&lt;i&gt;</b></section></main>"
        )
      }))

    it.effect("does not take an object that looks like Html for Html", () =>
      Effect.gen(function*() {
        const forged = { value: "<b>x</b>" } as unknown as string
        assert.strictEqual(yield* text(Html.make`${forged}`), "")
      }))

    it.effect("joins a list of text and Html, escaping the text", () =>
      Effect.gen(function*() {
        assert.strictEqual(
          yield* text(Html.make`<ul>${["a<", Html.raw("<li>b</li>")]}</ul>`),
          "<ul>a&lt;<li>b</li></ul>"
        )
      }))

    it.effect("holds trusted markup as it is with raw", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* text(Html.make`<p>${Html.raw("<svg></svg>")}</p>`), "<p><svg></svg></p>")
      }))

    it.effect("renders an Option's value and nothing for none", () =>
      Effect.gen(function*() {
        assert.strictEqual(
          yield* text(Html.make`${Option.some("<")}|${Option.none()}|${Option.some(Html.raw("<b>"))}`),
          "&lt;||<b>"
        )
      }))

    it.effect("escapes what an effect gives, and keeps its services and errors", () =>
      Effect.gen(function*() {
        const loaded = Greeting.use((greeting) => Effect.succeed(greeting.hello))
        const failing = Effect.fail("not found" as const)
        const markup = yield* text(Html.make`<p>${loaded}</p>`).pipe(
          Effect.provideService(Greeting, { hello: "hello <you>" })
        )
        assert.strictEqual(markup, "<p>hello &lt;you&gt;</p>")
        assert.strictEqual(yield* Effect.flip(Html.make`<p>${failing}</p>`), "not found")
      }))

    it.effect("awaits a list of effects, in the order of the template", () =>
      Effect.gen(function*() {
        const slow = Effect.yieldNow.pipe(Effect.as("<slow>"))
        assert.strictEqual(yield* text(Html.make`${slow}|${Effect.succeed("fast")}`), "&lt;slow&gt;|fast")
        assert.strictEqual(yield* text(Html.make`${Effect.succeed(["a", Html.raw("<i>b</i>")])}`), "a<i>b</i>")
      }))
  })

  describe("escape", () => {
    it("escapes &, <, >, \" and '", () => {
      assert.strictEqual(Html.escape("<a href=\"x\">'&'</a>"), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;")
    })
  })

  describe("isHtml", () => {
    it("is true for Html only", () => {
      assert.isTrue(Html.isHtml(Html.raw("<b>")))
      assert.isFalse(Html.isHtml("<b>"))
      assert.isFalse(Html.isHtml({ value: "<b>" }))
    })
  })

  describe("HttpServerResponse.html", () => {
    it.effect("sends Html as text/html, as it is", () =>
      Effect.gen(function*() {
        const html = yield* Html.make`<p>${"<script>"}</p>`
        const response = HttpServerResponse.toWeb(HttpServerResponse.html(html))
        assert.strictEqual(response.headers.get("content-type"), "text/html")
        assert.strictEqual(yield* Effect.promise(() => response.text()), "<p>&lt;script&gt;</p>")
      }))
  })
})
