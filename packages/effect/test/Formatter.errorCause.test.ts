import { assert, describe, it } from "@effect/vitest"
import { Formatter, Redactable, Redacted } from "effect"

describe("Formatter.format Error causes", () => {
  const falsyCauses: ReadonlyArray<readonly [string, unknown, string]> = [
    ["zero", 0, "0"],
    ["false", false, "false"],
    ["empty string", "", "\"\""],
    ["null", null, "null"],
    ["zero bigint", 0n, "0n"],
    ["NaN", NaN, "NaN"]
  ]

  for (const [name, cause, expected] of falsyCauses) {
    it(`formats the ${name} primitive`, () => {
      assert.strictEqual(Formatter.format(cause), expected)
    })

    it(`preserves the ${name} Error cause`, () => {
      assert.strictEqual(Formatter.format(new Error("outer", { cause })), `Error: outer (cause: ${expected})`)
    })
  }

  it("preserves truthy Error causes", () => {
    assert.strictEqual(Formatter.format(new Error("outer", { cause: 1 })), "Error: outer (cause: 1)")
    assert.strictEqual(Formatter.format(new Error("outer", { cause: true })), "Error: outer (cause: true)")
    assert.strictEqual(Formatter.format(new Error("outer", { cause: "inner" })), "Error: outer (cause: \"inner\")")
  })

  it("omits a missing cause", () => {
    assert.strictEqual(Formatter.format(new Error("outer")), "Error: outer")
  })

  it("continues to omit an explicitly undefined cause", () => {
    assert.strictEqual(Formatter.format(new Error("outer", { cause: undefined })), "Error: outer")
  })

  it("terminates circular Error causes", () => {
    const error = new Error("outer")
    error.cause = error
    assert.strictEqual(Formatter.format(error), "Error: outer (cause: [Circular])")
  })

  it("preserves shared non-circular Error causes", () => {
    const cause = new Error("inner")
    assert.strictEqual(
      Formatter.format([new Error("first", { cause }), new Error("second", { cause })]),
      "[Error: first (cause: Error: inner),Error: second (cause: Error: inner)]"
    )
  })

  it("redacts Error causes through the existing formatter", () => {
    const cause = Redacted.make("synthetic value")
    assert.strictEqual(Formatter.format(new Error("outer", { cause })), "Error: outer (cause: <redacted>)")
  })

  it("redacts an Error before inspecting its cause", () => {
    const error = Object.assign(new Error("outer", { cause: 0 }), {
      [Redactable.symbolRedactable]: () => "[REDACTED]"
    })
    assert.strictEqual(Formatter.format(error), "\"[REDACTED]\"")
  })

  it("preserves the ignoreToString path", () => {
    const error = new Error("outer", { cause: 0 })
    error.stack = "synthetic stack"
    // Native Error own properties and their order vary between runtimes.
    const properties = Object.fromEntries(
      Object.getOwnPropertyNames(error).map((key) => [key, Reflect.get(error, key)])
    )
    assert.strictEqual(
      Formatter.format(error, { ignoreToString: true }),
      `Error(${JSON.stringify(properties)})`
    )
  })
})
