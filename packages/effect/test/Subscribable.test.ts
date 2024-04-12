/**
 * @since 1.0.0
 */
import { describe } from "vitest"
import * as Subscribable from "effect/Subscribable"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as it from "effect-test/utils/extend"

describe("Subscribable", (ctx) => {
    it.scoped("fromStream/empty", (ctx) => Effect.gen(function* (_) {
        const s = Subscribable.fromStream(Stream.empty, 0);
        const res = yield* _(s.get)
        ctx.expect(res).toEqual(0);
    }))

    it.scoped("fromStream/iterable",(ctx) => Effect.gen(function* (_) {
        const s = Subscribable.fromStream(Stream.succeed(2), 1);
        const res = yield* _(s.get)
        yield* _(Stream.runDrain(s.changes))
        ctx.expect(res).toEqual(3);
    }))
})
