import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Logger, Option, Schema, Tracer } from "effect"
import { ClusterSchema, Entity, Sharding, TestRunner } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"

class OptionalLabel extends Context.Service<OptionalLabel, string>()("test/cluster/OptionalConstructionLabel") {}

const FallbackEntity = Entity.make("RegistrationFallback", [
  Rpc.make("Read", { success: Schema.String }).annotate(ClusterSchema.Persisted, false)
])

const register = (
  api: "registerEntity" | "toLayer",
  build: Effect.Effect<{ readonly Read: () => Effect.Effect<string> }>
) =>
  api === "registerEntity"
    ? Effect.flatMap(Sharding.Sharding, (sharding) => sharding.registerEntity(FallbackEntity, build))
    : Layer.build(FallbackEntity.toLayer(build)).pipe(Effect.asVoid)

const makeCapture = () => {
  const logs: Array<unknown> = []
  const spans: Array<string> = []
  const loggers = new Set([Logger.make((options) => {
    logs.push(options.message)
  })])
  const tracer = Tracer.make({
    span(options) {
      spans.push(options.name)
      return new Tracer.NativeSpan(options)
    }
  })
  return { logs, spans, loggers, tracer }
}

describe("Sharding registration fallback", () => {
  for (const api of ["registerEntity", "toLayer"] as const) {
    it.live(`${api}: preserves a construction-only optional application service`, () =>
      Effect.gen(function*() {
        const runtime = yield* Layer.build(TestRunner.layer).pipe(
          Effect.provideService(OptionalLabel, "construction-only")
        )
        yield* Effect.gen(function*() {
          assert.isTrue(Option.isNone(yield* Effect.serviceOption(OptionalLabel)))
          yield* register(
            api,
            Effect.gen(function*() {
              const label = yield* Effect.serviceOption(OptionalLabel)
              return FallbackEntity.of({ Read: () => Effect.succeed(Option.getOrElse(label, () => "missing")) })
            })
          )
          const client = (yield* FallbackEntity.client)("one")
          assert.strictEqual(yield* client.Read(), "construction-only")
        }).pipe(Effect.provideContext(runtime))
      }))

    for (const override of [false, true]) {
      it.live(`${api}: ${override ? "honors registration" : "preserves construction-only"} logger and tracer`, () => {
        const construction = makeCapture()
        const registration = makeCapture()
        const selected = override ? registration : construction
        const other = override ? construction : registration
        return Effect.gen(function*() {
          // Reading reference defaults does not install explicit context overrides.
          yield* Logger.CurrentLoggers
          yield* Tracer.Tracer
          const runtime = yield* Layer.build(TestRunner.layer).pipe(
            Effect.provideService(Logger.CurrentLoggers, construction.loggers),
            Effect.provideService(Tracer.Tracer, construction.tracer)
          )
          yield* Effect.gen(function*() {
            const current = yield* Effect.context<never>()
            assert.isFalse(current.mapUnsafe.has(Logger.CurrentLoggers.key))
            assert.isFalse(current.mapUnsafe.has(Tracer.Tracer.key))
            const build = Effect.gen(function*() {
              const loggers = yield* Logger.CurrentLoggers
              const tracer = yield* Tracer.Tracer
              yield* Effect.log("fallback-builder")
              return FallbackEntity.of({
                Read: () =>
                  Effect.succeed(JSON.stringify({
                    loggers: loggers === selected.loggers,
                    tracer: tracer === selected.tracer
                  }))
              })
            }).pipe(Effect.withSpan("fallback-builder"))
            const registrationEffect = register(api, build)
            yield* override
              ? registrationEffect.pipe(
                Effect.provideService(Logger.CurrentLoggers, registration.loggers),
                Effect.provideService(Tracer.Tracer, registration.tracer)
              )
              : registrationEffect
            const client = (yield* FallbackEntity.client)("one")
            const identities = JSON.parse(yield* client.Read())
            const builderLogs = (logs: Array<unknown>) =>
              logs.filter((log) => JSON.stringify(log) === "[\"fallback-builder\"]")
            const builderSpans = (spans: Array<string>) => spans.filter((name) => name === "fallback-builder")
            assert.deepStrictEqual({
              identities,
              selectedLogs: builderLogs(selected.logs),
              selectedSpans: builderSpans(selected.spans),
              otherLogs: builderLogs(other.logs),
              otherSpans: builderSpans(other.spans)
            }, {
              identities: { loggers: true, tracer: true },
              selectedLogs: [["fallback-builder"]],
              selectedSpans: ["fallback-builder"],
              otherLogs: [],
              otherSpans: []
            })
          }).pipe(Effect.provideContext(runtime))
        })
      })
    }
  }
})
