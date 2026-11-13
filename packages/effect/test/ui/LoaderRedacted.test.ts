// @vitest-environment happy-dom
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import { Loader } from "effect/reactivity"
import { Component } from "effect/ui"
import { Html, HtmlServer } from "effect/ui/html"
import { ssr } from "effect/ui/html/testing"
import { TestHost } from "effect/ui/testing"

it.effect("omits reads with Redacted args, success or error schemas from the server cache", () => {
  class Args extends Loader.Service<Args>()("secret/Args", {
    args: { token: Schema.Redacted(Schema.String) },
    success: Schema.String,
    error: Schema.Never,
    staleTime: Infinity
  }, Effect.succeed(() => Effect.succeed("ok"))) {}
  class Success extends Loader.Service<Success>()("secret/Success", {
    args: {},
    success: Schema.Redacted(Schema.String),
    error: Schema.Never,
    staleTime: Infinity
  }, Effect.succeed(() => Effect.succeed(Redacted.make("success-secret")))) {}
  class Error extends Loader.Service<Error>()("secret/Error", {
    args: { fail: Schema.Boolean },
    success: Schema.String,
    error: Schema.Redacted(Schema.String),
    staleTime: Infinity
  }, Effect.succeed(({ fail }) => fail ? Effect.fail(Redacted.make("error-secret")) : Effect.succeed("ok"))) {}
  class Optional extends Loader.Service<Optional>()("secret/Optional", {
    args: { token: Schema.optional(Schema.Redacted(Schema.String)) },
    success: Schema.String,
    error: Schema.Never,
    staleTime: Infinity
  }, Effect.succeed(() => Effect.succeed("ok"))) {}
  const App = Component.define({
    name: "Secrets",
    model: Schema.Struct({}),
    message: Schema.Never,
    elements: Html,
    loaders: {
      args: { load: Args, args: () => ({ token: Redacted.make("args-secret") }) },
      success: { load: Success, args: () => ({}) },
      keyed: { loadMany: Args, args: () => [{ token: Redacted.make("keyed-secret") }] },
      error: { load: Error, args: () => ({ fail: true }) },
      unusedError: { load: Error, args: () => ({ fail: false }) },
      absent: { load: Optional, args: () => ({}) }
    }
  }).make({ init: () => ({}), update: (model) => model, view: (_, h) => h.div("safe") })
  return Effect.gen(function*() {
    const rendered = yield* ssr(App, {})
    const wire = rendered.html + HtmlServer.serializeState(rendered.state)
    for (const secret of ["args-secret", "success-secret", "error-secret", "keyed-secret"]) {
      assert.notInclude(wire, secret)
    }
    // Even absent optional secrets and a successful read with a Redacted error
    // schema are excluded: eligibility is static, not value-dependent.
    assert.deepStrictEqual(rendered.state["~loader"], {})
    yield* TestHost.settle
    assert.lengthOf(rendered.root.fetches(), 6)
  }).pipe(
    Effect.provide(Layer.mergeAll(Args.layer, Success.layer, Error.layer, Optional.layer)),
    Effect.provide(TestHost.layer())
  )
})

interface Tree {
  readonly value: string
  readonly children: ReadonlyArray<Tree>
}
const Tree: Schema.Codec<Tree> = Schema.Struct({
  value: Schema.String,
  children: Schema.Array(Schema.suspend(() => Tree))
})

const hydrationCase = <A>(name: string, schema: Schema.Codec<A>, value: A, excluded = false) => {
  it.effect("hydrates " + name + " according to its schema", () => {
    class Read extends Loader.Service<Read>()("read/" + name, {
      args: {},
      success: schema,
      error: Schema.Never,
      staleTime: Infinity
    }, Effect.succeed(() => Effect.succeed(value))) {}
    const App = Component.define({
      name: "App",
      model: Schema.Struct({ value: schema }),
      message: Schema.Never,
      elements: Html,
      loaders: { value: { load: Read, args: () => ({}) } }
    }).make({ init: () => ({ value }), update: (model) => model, view: (_, h) => h.div("safe") })
    return Effect.gen(function*() {
      const rendered = yield* ssr(App, {})
      assert.notInclude(rendered.html + HtmlServer.serializeState(rendered.state), "recursive-secret")
      assert.deepStrictEqual(rendered.adopted, excluded ? [] : ["/App"])
      if (excluded) {
        assert.deepStrictEqual(rendered.state["~loader"], {})
      } else {
        assert.property(rendered.state["~loader"], "read/" + name)
      }
      yield* TestHost.settle
      assert.lengthOf(rendered.root.fetches(), excluded ? 1 : 0)
    }).pipe(Effect.provide(Read.layer), Effect.provide(TestHost.layer()))
  })
}

hydrationCase("suspended string", Schema.suspend(() => Schema.String), "ok")
hydrationCase("recursive tree", Tree, { value: "ok", children: [{ value: "child", children: [] }] })
hydrationCase(
  "suspended secret",
  Schema.suspend(() => Schema.Redacted(Schema.String)),
  Redacted.make("recursive-secret"),
  true
)

interface A {
  readonly b: ReadonlyArray<B>
  readonly secret: Redacted.Redacted<string>
}
interface B {
  readonly a: ReadonlyArray<A>
}
const A: Schema.Codec<A> = Schema.Struct({
  // Visit the cycle before the secret, to catch premature caching of a false result for B.
  b: Schema.Array(Schema.suspend(() => B)),
  secret: Schema.Redacted(Schema.String)
})
const B: Schema.Codec<B> = Schema.Struct({ a: Schema.Array(Schema.suspend(() => A)) })
hydrationCase("mutual recursion from A", A, { b: [], secret: Redacted.make("recursive-secret") }, true)
hydrationCase("mutual recursion from B", B, { a: [] }, true)
