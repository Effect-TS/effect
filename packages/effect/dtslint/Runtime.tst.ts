import type { Runtime } from "effect"
import { describe, expect, it } from "tstyche"

describe("Runtime", () => {
  it("Runtime.Context type helper", () => {
    type ContextOfRuntime = Runtime.Runtime.Context<Runtime.Runtime<{ foo: string }>>
    expect<ContextOfRuntime>().type.toBe<{ foo: string }>()
  })
})
