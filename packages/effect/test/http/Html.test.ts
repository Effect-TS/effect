import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Option } from "effect"
import { Html } from "effect/http"

const text = <E, R>(html: Effect.Effect<Html.Html, E, R>) => Effect.map(html, (_) => _.value)

class Greeting extends Context.Service<Greeting, { readonly hello: string }>()("test/Greeting") {}

describe("Html", () => {
  it.effect("escapes text and quoted ordinary attribute values", () =>
    Effect.gen(function*() {
      const attack = "&<>\"'"
      assert.strictEqual(
        yield* text(Html.make`<p title="${attack}" data-label='${attack}'>${attack} ${"&amp;"}</p>`),
        "<p title=\"&amp;&lt;&gt;&quot;&#39;\" data-label='&amp;&lt;&gt;&quot;&#39;'>&amp;&lt;&gt;&quot;&#39; &amp;amp;</p>"
      )
    }))

  it.effect("renders primitives, arrays and optional values", () =>
    Effect.gen(function*() {
      assert.strictEqual(
        yield* text(Html.make`[${[1, 2n, true, null, undefined, "<"]}|${Option.some("&")}|${Option.none()}]`),
        "[12true&lt;|&amp;|]"
      )
    }))

  it.effect("composes Html and explicitly trusted markup without double escaping", () =>
    Effect.gen(function*() {
      const component = Html.make`<b>${"<"}</b>`
      const html = yield* Html.make`<section>${component}</section>`
      assert.strictEqual(
        yield* text(Html.make`<main>${[html, Html.rawUnsafe("<i>trusted</i>")]}</main>`),
        "<main><section><b>&lt;</b></section><i>trusted</i></main>"
      )
    }))

  it.effect("escapes effect results and preserves services, errors and interpolation order", () =>
    Effect.gen(function*() {
      const loaded = Greeting.use((greeting) => Effect.yieldNow.pipe(Effect.as(greeting.hello)))
      assert.strictEqual(
        yield* text(Html.make`<p>${loaded}|${Effect.succeed("&")}</p>`).pipe(
          Effect.provideService(Greeting, { hello: "<you>" })
        ),
        "<p>&lt;you&gt;|&amp;</p>"
      )
      assert.strictEqual(yield* Effect.flip(Html.make`${Effect.fail("not found" as const)}`), "not found")
    }))

  it.effect("does not trust a JSON-forged Html value", () =>
    Effect.gen(function*() {
      const forged: Html.Html = JSON.parse("{\"~effect/http/Html\":1,\"value\":\"<script>alert(1)</script>\"}")
      assert.strictEqual(yield* text(Html.make`<p>${forged}</p>`), "<p></p>")
      assert.isFalse(Html.isHtml(forged))
    }))

  it("exposes escaping and recognizes only Html values", () => {
    assert.strictEqual(Html.escape("&<>\"'"), "&amp;&lt;&gt;&quot;&#39;")
    assert.isTrue(Html.isHtml(Html.rawUnsafe("<b>")))
    assert.isFalse(Html.isHtml("<b>"))
    assert.isFalse(Html.isHtml({ value: "<b>" }))
  })
})
