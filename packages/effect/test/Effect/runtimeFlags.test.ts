import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Flags from "effect/RuntimeFlags"
import * as Patch from "effect/RuntimeFlagsPatch"
import { assertFalse, assertTrue } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Effect", () => {
  it.it("should enable flags in the current fiber", () =>
    Effect.runPromise(Effect.gen(function*() {
      const before = yield* Effect.getRuntimeFlags
      assertFalse(Flags.isEnabled(before, Flags.OpSupervision))
      yield* Effect.patchRuntimeFlags(Patch.enable(Flags.OpSupervision))
      const after = yield* Effect.getRuntimeFlags
      assertTrue(Flags.isEnabled(after, Flags.OpSupervision))
    })))
  it.it("should enable flags in the wrapped effect", () =>
    Effect.runPromise(Effect.gen(function*() {
      const before = yield* Effect.getRuntimeFlags
      assertFalse(Flags.isEnabled(before, Flags.OpSupervision))
      const inside = yield* pipe(
        Effect.getRuntimeFlags,
        Effect.withRuntimeFlagsPatch(Patch.enable(Flags.OpSupervision))
      )
      const after = yield* Effect.getRuntimeFlags
      assertFalse(Flags.isEnabled(after, Flags.OpSupervision))
      assertTrue(Flags.isEnabled(inside, Flags.OpSupervision))
    })))
})
