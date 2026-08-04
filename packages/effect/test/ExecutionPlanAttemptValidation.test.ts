import { assert, describe, it } from "@effect/vitest"
import { Context, ExecutionPlan } from "effect"

describe("ExecutionPlan attempt validation", () => {
  it("rejects zero attempts", () => {
    assert.throws(() =>
      ExecutionPlan.make({
        provide: Context.empty(),
        attempts: 0
      })
    )
  })
})
