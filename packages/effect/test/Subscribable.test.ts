/**
 * @since 1.0.0
 */
import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Subscribable from "effect/Subscribable"
import { describe } from "vitest"

describe("Subscribable", () => {
  it.effect("fromStream/empty", (ctx) =>
    Effect.gen(function*(_) {
      const s = yield* _(Subscribable.fromStream(Stream.empty, 0))
      const res = yield* _(s.get)
      ctx.expect(res).toEqual(0)
    }))

  it.effect("fromStream/iterable", (ctx) =>
    Effect.gen(function*(_) {
      const s = yield* _(Subscribable.fromStream(Stream.fromIterable([1, 2, 3]), 1))
      const res = yield* _(s.get)
      ctx.expect(res).toEqual(3)
    }))
})
