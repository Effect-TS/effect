/**
 * @since 1.0.0
 */

import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import { describe } from "vitest"

describe("Effect", () => {
  it.scoped("makeAbortSignalScoped", (ctx) =>
    Effect.gen(function*(_) {
      const signal1 = yield* _(Effect.makeAbortSignalScoped)
      ctx.expect(signal1.aborted).toBeFalsy()

      const signal2 = yield* _(Effect.makeAbortSignalScoped, Effect.scoped)
      ctx.expect(signal2.aborted).toBeTruthy()
    }))
})
