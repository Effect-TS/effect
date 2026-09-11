import { EntityAddress, EntityId, EntityType, ShardId } from "@effect/cluster"
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, FiberId } from "effect"
import * as Abandon from "../src/internal/clusterAbandon.js"
import * as Teardown from "../src/internal/interruptors.js"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"

const address = EntityAddress.make({
  entityType: EntityType.EntityType.make("TeardownFollowup"),
  entityId: EntityId.make("one"),
  shardId: ShardId.make("default", 1)
})

it.effect("the storage shutdown marker survives composed causes and differs from ordinary interruption", () =>
  Effect.gen(function*() {
    const cause = yield* abandonmentCause
    assert.isTrue(Abandon.isCause(cause))
    assert.isTrue(Abandon.isCause(Cause.parallel(cause, Cause.interrupt(FiberId.none))))
    assert.isTrue(Abandon.isCause(Cause.sequential(Cause.die("defect"), cause)))
    assert.isFalse(Abandon.isCause(Cause.interrupt(FiberId.unsafeMake())))
    assert.isFalse(Abandon.isCause(Cause.fail("typed failure")))
  }).pipe(Effect.provide(MemoryLive)))

it.effect("nested teardown owners release only their own reference", () =>
  Effect.gen(function*() {
    Teardown.acquireEntity(address)
    Teardown.acquireEntity(address)
    try {
      Teardown.releaseEntity(address)
      assert.isTrue(Teardown.isActive(address))
      yield* Teardown.aroundEntityType(
        address.entityType,
        Effect.gen(function*() {
          Teardown.releaseEntity(address)
          assert.isTrue(Teardown.isActive(address))
          yield* Teardown.aroundShard(address.shardId, Effect.void)
          assert.isTrue(Teardown.isActive(address))
        })
      )
      assert.isFalse(Teardown.isActive(address))
    } finally {
      Teardown.releaseEntity(address)
      Teardown.releaseEntity(address)
    }
  }))

it.effect("interrupted teardown releases the active classification", () =>
  Effect.gen(function*() {
    const exit = yield* Teardown.aroundShard(
      address.shardId,
      Effect.gen(function*() {
        assert.isTrue(Teardown.isActive(address))
        return yield* Effect.interrupt
      })
    ).pipe(Effect.exit)
    assert(Exit.isInterrupted(exit))
    assert.isFalse(Teardown.isActive(address))
  }))
