import { type ChildProcess, type CommandLine } from "effect/process"
import { describe, expect, it } from "tstyche"

describe("ChildProcess", () => {
  it("keeps the template expression types as aliases of CommandLine", () => {
    expect<ChildProcess.TemplateExpression>().type.toBe<CommandLine.TemplateExpression>()
    expect<ChildProcess.TemplateExpressionItem>().type.toBe<CommandLine.TemplateExpressionItem>()
  })
})
