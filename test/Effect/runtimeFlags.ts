import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Flags from "effect/RuntimeFlags"
import * as Patch from "effect/RuntimeFlagsPatch"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.it("should enable flags in the current fiber", () =>
    Effect.runPromise(Effect.gen(function*($) {
      const before = yield* $(Effect.getRuntimeFlags)
      assert.isFalse(Flags.isEnabled(before, Flags.OpSupervision))
      yield* $(Effect.patchRuntimeFlags(Patch.enable(Flags.OpSupervision)))
      const after = yield* $(Effect.getRuntimeFlags)
      assert.isTrue(Flags.isEnabled(after, Flags.OpSupervision))
    })))
  it.it("should enable flags in the wrapped effect", () =>
    Effect.runPromise(Effect.gen(function*($) {
      const before = yield* $(Effect.getRuntimeFlags)
      assert.isFalse(Flags.isEnabled(before, Flags.OpSupervision))
      const inside = yield* $(Effect.getRuntimeFlags, Effect.withRuntimeFlagsPatch(Patch.enable(Flags.OpSupervision)))
      const after = yield* $(Effect.getRuntimeFlags)
      assert.isFalse(Flags.isEnabled(after, Flags.OpSupervision))
      assert.isTrue(Flags.isEnabled(inside, Flags.OpSupervision))
    })))
})
