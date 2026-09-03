import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Schema } from "effect"
import { Entity, ShardingConfig } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"

const Calls = Entity.make("R4FlagVerification", [
  Rpc.make("Hold", { success: Schema.Number }),
  Rpc.make("Bad", { error: Schema.String })
])

const snapshot = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isSuccess(exit)
    ? { _tag: "Success", value: exit.value }
    : {
      _tag: "Failure",
      reasons: exit.cause.reasons.map((reason) =>
        reason._tag === "Die"
          ? { _tag: reason._tag, defect: reason.defect }
          : reason._tag === "Fail"
          ? { _tag: reason._tag, error: reason.error }
          : { _tag: reason._tag }
      )
    }

const observe = (disableFatalDefects: boolean | undefined, defecting: boolean, separateIds = false) =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const layer = Calls.toLayer({
      Hold: () =>
        Effect.gen(function*() {
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(release)
          return 42
        }),
      Bad: () => defecting ? Effect.die("R4 fixture defect") : Effect.fail("R4 typed failure")
    }, {
      concurrency: "unbounded",
      ...(disableFatalDefects === undefined ? {} : { disableFatalDefects })
    })
    const clientFor = yield* Entity.makeTestClient(Calls, layer)
    const holdClient = yield* clientFor("one")
    const badClient = yield* clientFor(separateIds ? "two" : "one")
    yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
    const good = yield* Effect.forkChild(holdClient.Hold())
    yield* Deferred.await(entered)
    const badExit = yield* Effect.exit(badClient.Bad())
    yield* Deferred.succeed(release, undefined)
    const goodExit = yield* Fiber.await(good)
    return { badExit: snapshot(badExit), goodExit: snapshot(goodExit) }
  }).pipe(Effect.provide(ShardingConfig.layerDefaults), Effect.timeout("5 seconds"))

describe.sequential("R4 entity test-client flag", () => {
  for (const flag of [true, false, undefined]) {
    const label = flag === undefined ? "omitted" : String(flag)
    it.live(`FLAG-DEFECT-${label}: overlapping same-ID calls preserve explicit flag`, () =>
      Effect.gen(function*() {
        const actual = yield* observe(flag, true)
        console.log(JSON.stringify({ assertionId: `FLAG-DEFECT-${label}`, ...actual }))
        assert.deepEqual(actual.badExit, snapshot(Exit.die("R4 fixture defect")), "Bad preserves the original defect")
        assert.deepEqual(
          actual.goodExit,
          snapshot(flag === true ? Exit.succeed(42) : Exit.die("R4 fixture defect")),
          "Hold isolation follows the registered flag"
        )
      }))

    it.live(`FLAG-TYPED-${label}: typed failure is request-local`, () =>
      Effect.gen(function*() {
        const actual = yield* observe(flag, false)
        console.log(JSON.stringify({ assertionId: `FLAG-TYPED-${label}`, ...actual }))
        assert.deepEqual(actual.badExit, snapshot(Exit.fail("R4 typed failure")))
        assert.deepEqual(actual.goodExit, snapshot(Exit.succeed(42)))
      }))
  }

  it.live("FLAG-DISTINCT-IDS: fatal defect does not cross entity IDs", () =>
    Effect.gen(function*() {
      const actual = yield* observe(false, true, true)
      console.log(JSON.stringify({ assertionId: "FLAG-DISTINCT-IDS", ...actual }))
      assert.deepEqual(actual.badExit, snapshot(Exit.die("R4 fixture defect")))
      assert.deepEqual(actual.goodExit, snapshot(Exit.succeed(42)))
    }))
})
