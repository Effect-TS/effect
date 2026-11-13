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
