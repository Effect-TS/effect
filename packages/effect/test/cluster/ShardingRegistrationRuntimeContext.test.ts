import { assert, it } from "@effect/vitest"
import { Effect, Layer, Logger, Schema, Tracer } from "effect"
import { Entity, Sharding, TestRunner } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"

const RuntimeEntity = Entity.make("RegistrationRuntimeContext", [Rpc.make("Read", { success: Schema.String })])

it.live("Sharding registration runtime preserves a shared logger and tracer", () => {
  const logs: Array<unknown> = []
  const spans: Array<string> = []
  const logger = Logger.make((options) => {
    logs.push(options.message)
  })
  const tracer = Tracer.make({
    span(options) {
      spans.push(options.name)
      return new Tracer.NativeSpan(options)
    }
  })
  const loggers = new Set([logger])
  return Effect.gen(function*() {
    const runtime = yield* Layer.build(TestRunner.layer)
    yield* Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      yield* sharding.registerEntity(
        RuntimeEntity,
        Effect.gen(function*() {
          const actualLoggers = yield* Logger.CurrentLoggers
          const actualTracer = yield* Tracer.Tracer
          yield* Effect.log("registration-builder")
          return RuntimeEntity.of({
            Read: () =>
              Effect.succeed(JSON.stringify({ loggers: actualLoggers === loggers, tracer: actualTracer === tracer }))
          })
        }).pipe(Effect.withSpan("registration-builder"))
      )
      const client = (yield* RuntimeEntity.client)("one")
      assert.deepStrictEqual(JSON.parse(yield* client.Read()), { loggers: true, tracer: true })
      assert.deepStrictEqual(logs.filter((entry) => JSON.stringify(entry) === "[\"registration-builder\"]"), [
        ["registration-builder"]
      ])
      assert.deepStrictEqual(spans.filter((name) => name === "registration-builder"), ["registration-builder"])
    }).pipe(Effect.provideContext(runtime))
  }).pipe(
    Effect.provideService(Logger.CurrentLoggers, loggers),
    Effect.provideService(Tracer.Tracer, tracer)
  )
})
