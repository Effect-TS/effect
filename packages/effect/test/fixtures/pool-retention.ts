import assert from "node:assert/strict"
import { setImmediate as nextTurn } from "node:timers/promises"

import { Deferred, Effect, Exit, Pool, Scope } from "effect"

// A separate process avoids Vitest retaining resources in assertions or mocks.
// Only public Pool APIs are used, against the workspace source.
const scenario = process.argv[2]
const owner = Scope.makeUnsafe()
const references: Array<WeakRef<object>> = []
let acquired = 0
let finalized = 0
const acquire = Effect.acquireRelease(
  Effect.sync(() => ({ id: ++acquired, payload: {} })),
  () =>
    Effect.sync(() => {
      finalized++
    })
)
const failedAcquire = Effect.suspend(() => {
  acquired++
  const payload = {}
  references.push(new WeakRef(payload))
  return Effect.fail({ payload })
})
const cleanupStarted = Deferred.makeUnsafe<void>()
const resumeCleanup = Deferred.makeUnsafe<void>()
const delayedFailedAcquire = Effect.suspend(() =>
  acquired === 0
    ? Effect.gen(function*() {
      yield* Effect.addFinalizer(() =>
        Effect.gen(function*() {
          yield* Deferred.succeed(cleanupStarted, undefined)
          yield* Deferred.await(resumeCleanup)
          finalized++
        })
      )
      return yield* failedAcquire
    })
    : acquire
)
const pool = await Effect.runPromise(
  Pool.makeWithTTL({
    acquire: scenario === "failed"
      ? failedAcquire
      : scenario === "failed-during-cleanup"
      ? delayedFailedAcquire
      : acquire,
    min: scenario === "failed" ? 0 : 1,
    max: 2,
    timeToLive: "1 hour",
    timeToLiveStrategy: "usage"
  }).pipe(Effect.provideService(Scope.Scope, owner))
)

async function retireOne() {
  // This function must return before collection: neither a local variable nor
  // a resolved request promise should keep the retired resource reachable.
  const value = await Effect.runPromise(Effect.scoped(Pool.get(pool)))
  references.push(new WeakRef(value.payload))
  await Effect.runPromise(Pool.invalidate(pool, value))
}

async function consumeFailure() {
  const exit = await Effect.runPromiseExit(Effect.scoped(Pool.get(pool)))
  assert(Exit.isFailure(exit))
}

try {
  if (scenario === "invalidated") {
    // Sequential invalidations keep usage at minimum; bursts would drain the old queue.
    for (let i = 0; i < 20; i++) await retireOne()
    assert.equal(finalized, 20)
  } else if (scenario === "failed") {
    // Consume each failed acquisition before retrying it.
    for (let i = 0; i < 20; i++) await consumeFailure()
    assert.equal(acquired, 20)
  } else if (scenario === "failed-during-cleanup") {
    await Effect.runPromise(Deferred.await(cleanupStarted))
    // Failed items are available before their asynchronous cleanup finishes.
    // Consume this one before onAcquire gets a chance to enqueue it.
    await consumeFailure()
    assert.equal(finalized, 0)
    await Effect.runPromise(Deferred.succeed(resumeCleanup, undefined))
    // A healthy replacement keeps the pool at minimum during collection.
    await Effect.runPromise(Effect.scoped(Pool.get(pool)))
    assert.equal(acquired, 2)
    assert.equal(finalized, 1)
  } else if (scenario === "shutdown") {
    await Effect.runPromise(
      Effect.scoped(
        Pool.use(pool, (value) =>
          Effect.sync(() => {
            references.push(new WeakRef(value.payload))
          }))
      )
    )
    await Effect.runPromise(Scope.close(owner, Exit.void))
    assert.equal(finalized, acquired)
  } else {
    throw new Error("Unknown pool retention scenario")
  }

  assert(global.gc, "Start the fixture with --expose-gc")
  // Cross job boundaries before every collection: WeakRef.deref keeps its
  // target alive until the current job ends. Never dereference between GCs.
  for (let i = 0; i < 8; i++) {
    await nextTurn()
    global.gc()
  }
  await nextTurn()
  const retained = references.filter((reference) => reference.deref()).length
  assert(Pool.isPool(pool)) // Keep the pool itself reachable through collection.
  process.stdout.write(
    JSON.stringify({ retained, tracked: references.length, finalized })
  )
} finally {
  await Effect.runPromise(Deferred.succeed(resumeCleanup, undefined))
  await Effect.runPromise(Scope.close(owner, Exit.void))
}
