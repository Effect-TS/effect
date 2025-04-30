import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Flags from "effect/RuntimeFlags"
import * as Patch from "effect/RuntimeFlagsPatch"

describe("Effect", () => {
  it("should enable flags in the current fiber", () =>
    Effect.runPromise(Effect.gen(function*() {
      const before = yield* Effect.getRuntimeFlags
      assertFalse(Flags.isEnabled(before, Flags.OpSupervision))
      yield* Effect.patchRuntimeFlags(Patch.enable(Flags.OpSupervision))
      const after = yield* Effect.getRuntimeFlags
      assertTrue(Flags.isEnabled(after, Flags.OpSupervision))
    })))
  it("should enable flags in the wrapped effect", () =>
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
