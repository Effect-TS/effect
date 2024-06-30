import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

it.live(
  "live %s",
  () => Effect.sync(() => expect(1).toEqual(1))
)
it.effect(
  "effect",
  () => Effect.sync(() => expect(1).toEqual(1))
)
it.scoped(
  "scoped",
  () => Effect.acquireRelease(Effect.sync(() => expect(1).toEqual(1)), () => Effect.void)
)
it.scopedLive(
  "scopedLive",
  () => Effect.acquireRelease(Effect.sync(() => expect(1).toEqual(1)), () => Effect.void)
)

// each

it.live.each([1, 2, 3])(
  "live each %s",
  (n) => Effect.sync(() => expect(n).toEqual(n))
)
it.effect.each([1, 2, 3])(
  "effect each %s",
  (n) => Effect.sync(() => expect(n).toEqual(n))
)
it.scoped.each([1, 2, 3])(
  "scoped each %s",
  (n) => Effect.acquireRelease(Effect.sync(() => expect(n).toEqual(n)), () => Effect.void)
)
it.scopedLive.each([1, 2, 3])(
  "scopedLive each %s",
  (n) => Effect.acquireRelease(Effect.sync(() => expect(n).toEqual(n)), () => Effect.void)
)

// skip

it.live.skip(
  "live skipped",
  () => Effect.die("skipped anyway")
)
it.effect.skip(
  "effect skipped",
  () => Effect.die("skipped anyway")
)
it.scoped.skip(
  "scoped skipped",
  () => Effect.acquireRelease(Effect.die("skipped anyway"), () => Effect.void)
)
it.scopedLive.skip(
  "scopedLive skipped",
  () => Effect.acquireRelease(Effect.die("skipped anyway"), () => Effect.void)
)
