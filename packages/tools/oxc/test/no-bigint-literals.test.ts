import rule from "@effect/oxc/oxlint/rules/no-bigint-literals"
import type { Fix, Fixer } from "@oxlint/plugins"
import { assert, describe, it } from "vitest"
import { runRule } from "./utils.ts"

describe("no-bigint-literals", () => {
  it.each([
    ["0n", "0"],
    ["1n", "1"],
    ["9007199254740991n", "9007199254740991"],
    ["9007199254740992n", "9007199254740992"],
    ["9007199254740993n", "9007199254740993"],
    ["-9007199254740993n", "-9007199254740993"]
  ])("preserves the exact value of %s when fixed", (source, expected) => {
    const start = source.startsWith("-") ? 1 : 0
    const node = {
      type: "Literal",
      value: BigInt(expected.startsWith("-") ? expected.slice(1) : expected),
      range: [start, source.length] as [number, number]
    }
    const errors = runRule(rule, "Literal", node)
    assert.strictEqual(errors.length, 1)
    assert.strictEqual(errors[0].message, "BigInt literals are not allowed")
    const report = errors[0] as typeof errors[number] & { fix: (fixer: Pick<Fixer, "replaceText">) => Fix }
    const fix = report.fix({ replaceText: (target, text) => ({ range: target.range, text }) })
    const fixed = source.slice(0, fix.range[0]) + fix.text + source.slice(fix.range[1])
    assert.strictEqual(Function(`return ${fixed}`)().toString(), expected)
  })

  it.each([1, "9007199254740993"])("ignores non-bigint literal %s", (value) => {
    assert.strictEqual(runRule(rule, "Literal", { type: "Literal", value }).length, 0)
  })
})
