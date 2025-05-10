import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import { FastCheck as fc, pipe, RuntimeFlags, RuntimeFlagsPatch } from "effect"

const arbRuntimeFlag = fc.constantFrom(
  RuntimeFlags.None,
  RuntimeFlags.Interruption,
  RuntimeFlags.OpSupervision,
  RuntimeFlags.RuntimeMetrics,
  RuntimeFlags.WindDown,
  RuntimeFlags.CooperativeYielding
)

const arbRuntimeFlags = fc.uniqueArray(arbRuntimeFlag).map(
  (flags) => RuntimeFlags.make(...flags)
)

describe("RuntimeFlags", () => {
  it("isDisabled & isEnabled", () => {
    const flags = RuntimeFlags.make(
      RuntimeFlags.RuntimeMetrics,
      RuntimeFlags.Interruption
    )
    assertTrue(RuntimeFlags.isEnabled(flags, RuntimeFlags.RuntimeMetrics))
    assertTrue(RuntimeFlags.isEnabled(flags, RuntimeFlags.Interruption))
    assertFalse(RuntimeFlags.isEnabled(flags, RuntimeFlags.CooperativeYielding))
    assertFalse(RuntimeFlags.isEnabled(flags, RuntimeFlags.OpSupervision))
    assertFalse(RuntimeFlags.isEnabled(flags, RuntimeFlags.WindDown))
  })

  it("enabled patching", () => {
    const patch = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.RuntimeMetrics),
      RuntimeFlagsPatch.andThen(RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision))
    )
    const result = RuntimeFlags.patch(RuntimeFlags.none, patch)

    const expected = RuntimeFlags.make(
      RuntimeFlags.RuntimeMetrics,
      RuntimeFlags.OpSupervision
    )
    strictEqual(result, expected)
  })

  it("inverse patching", () => {
    const flags = RuntimeFlags.make(
      RuntimeFlags.RuntimeMetrics,
      RuntimeFlags.OpSupervision
    )
    const patch1 = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.RuntimeMetrics),
      RuntimeFlagsPatch.inverse
    )
    const patch2 = pipe(
      RuntimeFlagsPatch.enable(RuntimeFlags.RuntimeMetrics),
      RuntimeFlagsPatch.andThen(RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision)),
      RuntimeFlagsPatch.inverse
    )
    strictEqual(
      RuntimeFlags.patch(flags, patch1),
      RuntimeFlags.make(RuntimeFlags.OpSupervision)
    )
    strictEqual(
      RuntimeFlags.patch(flags, patch2),
      RuntimeFlags.none
    )
  })

  it("diff", () => {
    const flags1 = RuntimeFlags.make(RuntimeFlags.RuntimeMetrics)
    const flags2 = RuntimeFlags.make(RuntimeFlags.RuntimeMetrics, RuntimeFlags.OpSupervision)
    strictEqual(
      RuntimeFlags.diff(flags1, flags2),
      RuntimeFlagsPatch.enable(RuntimeFlags.OpSupervision)
    )
  })

  it("flags within a set of RuntimeFlags is enabled", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const result = Array.from(RuntimeFlags.toSet(flags)).every(
        (flag) => RuntimeFlags.isEnabled(flags, flag)
      )
      assertTrue(result)
    }))
  })

  it("patching a diff between `none` and a set of flags is an identity", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const diff = RuntimeFlags.diff(RuntimeFlags.none, flags)
      strictEqual(
        RuntimeFlags.patch(RuntimeFlags.none, diff),
        flags
      )
    }))
  })

  it("patching the inverse diff between `non` and a set of flags is `none`", () => {
    fc.assert(fc.property(arbRuntimeFlags, (flags) => {
      const diff = RuntimeFlags.diff(RuntimeFlags.none, flags)
      strictEqual(
        RuntimeFlags.patch(flags, RuntimeFlagsPatch.inverse(diff)),
        RuntimeFlags.none
      )
      strictEqual(
        RuntimeFlags.patch(flags, RuntimeFlagsPatch.inverse(RuntimeFlagsPatch.inverse(diff))),
        flags
      )
    }))
  })
})
