import { assert, describe, it } from "@effect/vitest"
import { Clock, Context, Effect, Exit, Layer, Schema, Scope } from "effect"
import {
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake,
  TestRunner
} from "effect/unstable/cluster"
import { EntityReaper } from "effect/unstable/cluster/internal/entityReaper"
import { Rpc } from "effect/unstable/rpc"
import { CallerId, ContextBleedEntity, ContextBleedLayer } from "./TestEntity.ts"

class Label extends Context.Service<Label, string>()("test/cluster/RegistrationLabel") {}
class RegistrationOnly extends Context.Service<RegistrationOnly, string>()("test/cluster/RegistrationOnly") {}

const Read = Rpc.make("Read", { success: Schema.String }).annotate(ClusterSchema.Persisted, false)
const LabelEntity = Entity.make("RegistrationLabel", [Read])
const SecondEntity = Entity.make("SecondRegistrationLabel", [Read])
const build = Effect.map(Label, (label) => LabelEntity.of({ Read: () => Effect.succeed(label) }))

describe("Sharding registration context", () => {
  it.live("uses the explicit registration service instead of the construction service", () =>
    Effect.gen(function*() {
      const runtime = yield* Layer.build(TestRunner.layer).pipe(Effect.provideService(Label, "construction"))
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        yield* sharding.registerEntity(LabelEntity, build).pipe(Effect.provideService(Label, "registration"))
        const client = (yield* LabelEntity.client)("one")
        assert.strictEqual(yield* client.Read(), "registration")
      }).pipe(Effect.provideContext(runtime))
    }))

  it.live("forwards services supplied to Entity.toLayer at registration", () =>
    Effect.gen(function*() {
      const runtime = yield* Layer.build(TestRunner.layer).pipe(Effect.provideService(Label, "construction"))
      yield* Effect.gen(function*() {
        yield* Layer.build(LabelEntity.toLayer(build)).pipe(Effect.provideService(Label, "registration"))
        const client = (yield* LabelEntity.client)("one")
        assert.strictEqual(yield* client.Read(), "registration")
      }).pipe(Effect.provideContext(runtime))
    }))

  it.live("accepts registration-only services without a competing construction service", () =>
    Effect.gen(function*() {
      const runtime = yield* Layer.build(TestRunner.layer)
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        yield* sharding.registerEntity(
          LabelEntity,
          Effect.gen(function*() {
            const label = yield* Label
            const other = yield* RegistrationOnly
            return LabelEntity.of({ Read: () => Effect.succeed(`${label}:${other}`) })
          })
        ).pipe(
          Effect.provideService(Label, "registration"),
          Effect.provideService(RegistrationOnly, "only")
        )
        const client = (yield* LabelEntity.client)("one")
        assert.strictEqual(yield* client.Read(), "registration:only")
      }).pipe(Effect.provideContext(runtime))
    }))

  it.live("preserves an override inside the handler builder", () =>
    Effect.gen(function*() {
      const runtime = yield* Layer.build(TestRunner.layer).pipe(Effect.provideService(Label, "construction"))
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        yield* sharding.registerEntity(LabelEntity, build.pipe(Effect.provideService(Label, "builder"))).pipe(
          Effect.provideService(Label, "registration")
        )
        const client = (yield* LabelEntity.client)("one")
        assert.strictEqual(yield* client.Read(), "builder")
      }).pipe(Effect.provideContext(runtime))
    }))

  for (const competing of [false, true]) {
    it.live(`keeps two registrations independent (competing construction service: ${competing})`, () =>
      Effect.gen(function*() {
        const construction = Layer.build(TestRunner.layer)
        const runtime = yield* competing
          ? construction.pipe(Effect.provideService(Label, "construction"))
          : construction
        yield* Effect.gen(function*() {
          const sharding = yield* Sharding.Sharding
          yield* sharding.registerEntity(LabelEntity, build).pipe(Effect.provideService(Label, "first"))
          yield* sharding.registerEntity(SecondEntity, build).pipe(Effect.provideService(Label, "second"))
          const first = (yield* LabelEntity.client)("one")
          const second = (yield* SecondEntity.client)("one")
          assert.deepStrictEqual([yield* first.Read(), yield* second.Read(), yield* first.Read()], [
            "first",
            "second",
            "first"
          ])
        }).pipe(Effect.provideContext(runtime))
      }))
  }

  it.live("does not freeze the first volatile caller's context into later calls", () =>
    Effect.gen(function*() {
      const runtime = yield* Layer.build(ContextBleedLayer.pipe(Layer.provideMerge(TestRunner.layer)))
      yield* Effect.gen(function*() {
        const client = (yield* ContextBleedEntity.client)("one")
        assert.strictEqual(yield* client.ReadCaller().pipe(Effect.provideService(CallerId, "A")), "A")
        assert.strictEqual(yield* client.ReadCaller(), "none")
        assert.strictEqual(yield* client.ReadCallerPersisted(), "none")
      }).pipe(Effect.provideContext(runtime))
    }))

  it.live("retains the runner's config, clock, reaper and generator, and the registration scope", () =>
    Effect.gen(function*() {
      const constructionClock = yield* Clock.Clock
      const config = { ...ShardingConfig.defaults, preemptiveShutdown: false }
      const runtime = yield* Layer.build(Sharding.layer.pipe(
        Layer.provideMerge(Runners.layerNoop),
        Layer.provideMerge(MessageStorage.layerMemory),
        Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop]),
        Layer.provide(Layer.succeed(ShardingConfig.ShardingConfig, config))
      )).pipe(Effect.provideService(Clock.Clock, constructionClock))
      const registrationScope = yield* Scope.fork(yield* Effect.scope)
      const otherGenerator = yield* Snowflake.makeGenerator
      const otherReaper = yield* EntityReaper.make
      let released = false
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        yield* sharding.registerEntity(
          LabelEntity,
          Effect.gen(function*() {
            const actualConfig = yield* ShardingConfig.ShardingConfig
            const actualClock = yield* Clock.Clock
            const actualGenerator = yield* Snowflake.Generator
            const actualReaper = yield* EntityReaper
            const entityScope = yield* Effect.scope
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                released = true
              })
            )
            return LabelEntity.of({
              Read: () =>
                Effect.succeed(JSON.stringify({
                  config: actualConfig === config,
                  clock: actualClock === constructionClock,
                  generator: actualGenerator !== otherGenerator,
                  reaper: actualReaper !== otherReaper,
                  entityScope: entityScope !== registrationScope
                }))
            })
          })
        ).pipe(
          Scope.provide(registrationScope),
          Effect.provideService(ShardingConfig.ShardingConfig, { ...config, entityMailboxCapacity: 123 }),
          Effect.provideService(Clock.Clock, { ...constructionClock }),
          Effect.provideService(Snowflake.Generator, otherGenerator),
          Effect.provideService(EntityReaper, otherReaper)
        )
        const client = (yield* LabelEntity.client)("one")
        assert.deepStrictEqual(JSON.parse(yield* client.Read()), {
          config: true,
          clock: true,
          generator: true,
          reaper: true,
          entityScope: true
        })
        assert.isFalse(released)
        yield* Scope.close(registrationScope, Exit.void)
        assert.isTrue(released)
        assert.isFalse(yield* sharding.isShutdown)
      }).pipe(Effect.provideContext(runtime))
    }))
})
