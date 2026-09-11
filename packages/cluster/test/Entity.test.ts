import { Entity, ShardingConfig } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Schema } from "effect"
import { CallerId, ContextBleedEntity, ContextBleedLayer, TestEntity, TestEntityLayer, User } from "./TestEntity.js"

describe.concurrent("Entity", () => {
  describe("makeTestClient", () => {
    it.scoped("round trip", () =>
      Effect.gen(function*() {
        const makeClient = yield* Entity.makeTestClient(TestEntity, TestEntityLayer)
        const client = yield* makeClient("123")
        const user = yield* client.GetUser({ id: 1 })
        assert.deepEqual(user, new User({ id: 1, name: "User 1" }))
      }).pipe(Effect.provide(TestShardingConfig)))

    it.scoped("does not freeze the acquiring fiber's context into the entity server", () =>
      Effect.gen(function*() {
        const makeClient = yield* Entity.makeTestClient(ContextBleedEntity, ContextBleedLayer)
        const client = yield* makeClient("1").pipe(Effect.provideService(CallerId, "A"))

        const observed = yield* client.ReadCaller()
        assert.strictEqual(observed, "none")
      }).pipe(Effect.provide(TestShardingConfig)))
  })
})

const TestShardingConfig = ShardingConfig.layer({
  shardsPerGroup: 300,
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100
})

const FatalDefectEntity = Entity.make("FatalDefectEntity", [
  Rpc.make("Hold", { success: Schema.Number }),
  Rpc.make("Bad", { error: Schema.String })
])

const snapshot = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isSuccess(exit)
    ? { _tag: "Success", value: exit.value }
    : { _tag: "Failure", failures: [...Cause.failures(exit.cause)], defects: [...Cause.defects(exit.cause)] }

const observeFatalDefect = (disableFatalDefects: boolean | undefined, defecting: boolean, separateIds = false) =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const layer = FatalDefectEntity.toLayer({
      Hold: () =>
        Effect.gen(function*() {
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(release)
          return 42
        }),
      Bad: () => defecting ? Effect.die("fixture defect") : Effect.fail("typed failure")
    }, {
      concurrency: "unbounded",
      ...(disableFatalDefects === undefined ? {} : { disableFatalDefects })
    })
    const clientFor = yield* Entity.makeTestClient(FatalDefectEntity, layer)
    const holdClient = yield* clientFor("one")
    const badClient = yield* clientFor(separateIds ? "two" : "one")
    yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
    const good = yield* Effect.fork(holdClient.Hold())
    yield* Deferred.await(entered)
    const badExit = yield* Effect.exit(badClient.Bad())
    yield* Deferred.succeed(release, undefined)
    const goodExit = yield* Fiber.await(good)
    return { badExit: snapshot(badExit), goodExit: snapshot(goodExit) }
  }).pipe(Effect.provide(ShardingConfig.layerDefaults), Effect.timeout("5 seconds"))

for (const flag of [true, false, undefined]) {
  const label = flag === undefined ? "omitted" : String(flag)
  it.scoped(`isolates defects when disableFatalDefects is ${label}`, () =>
    Effect.gen(function*() {
      const actual = yield* observeFatalDefect(flag, true)
      assert.deepEqual(actual.badExit, snapshot(Exit.die("fixture defect")), "Bad preserves the original defect")
      assert.deepEqual(
        actual.goodExit,
        snapshot(flag === true ? Exit.succeed(42) : Exit.die("fixture defect")),
        "Hold isolation follows the registered flag"
      )
    }))

  it.scoped(`keeps typed failures request-local when disableFatalDefects is ${label}`, () =>
    Effect.gen(function*() {
      const actual = yield* observeFatalDefect(flag, false)
      assert.deepEqual(actual.badExit, snapshot(Exit.fail("typed failure")))
      assert.deepEqual(actual.goodExit, snapshot(Exit.succeed(42)))
    }))
}

it.scoped("does not send fatal defects across entity IDs", () =>
  Effect.gen(function*() {
    const actual = yield* observeFatalDefect(false, true, true)
    assert.deepEqual(actual.badExit, snapshot(Exit.die("fixture defect")))
    assert.deepEqual(actual.goodExit, snapshot(Exit.succeed(42)))
  }))
