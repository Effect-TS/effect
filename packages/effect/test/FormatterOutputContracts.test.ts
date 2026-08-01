import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Formatter } from "effect"

describe("Formatter output contracts", () => {
  it("returns a string for undefined JSON input", () => {
    const output: string = Formatter.formatJson(undefined)
    strictEqual(typeof output, "string", "formatJson is declared to return a string")
  })

  it("does not classify shared references as circular", () => {
    const shared = { value: 1 }
    strictEqual(
      Formatter.format({ first: shared, second: shared }),
      "{\"first\":{\"value\":1},\"second\":{\"value\":1}}",
      "only ancestor cycles should be circular"
    )
  })
})
