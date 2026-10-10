import { describe, expect, it } from "@effect/vitest"
import { CliOutput, Command, Flag } from "effect/cli"
import { toImpl } from "effect/cli/internal/command"

describe("CliOutput.displayWidth", () => {
  it("counts ASCII as one cell per character", () => {
    expect(CliOutput.displayWidth("")).toBe(0)
    expect(CliOutput.displayWidth("file")).toBe(4)
  })

  it("counts East Asian wide characters as two cells", () => {
    expect(CliOutput.displayWidth("ファイル")).toBe(8)
    expect(CliOutput.displayWidth("a界b")).toBe(4)
  })

  it("ignores combining marks", () => {
    expect(CliOutput.displayWidth("\u00E9")).toBe(1)
    expect(CliOutput.displayWidth("e\u0301")).toBe(1)
  })

  it("counts emoji presentation sequences as two cells", () => {
    expect(CliOutput.displayWidth("1️⃣")).toBe(2)
    expect(CliOutput.displayWidth("👍")).toBe(2)
  })

  it("measures styled and unstyled text the same", () => {
    expect(CliOutput.displayWidth("\u001B[1mbold\u001B[0m")).toBe(4)
    expect(CliOutput.displayWidth("\u001B[31mファイル\u001B[0m")).toBe(8)
  })

  it("agrees with the column layout the help output uses", () => {
    const command = Command.make("app", {
      short: Flag.String("short"),
      wide: Flag.String("wide", { description: "ファイル" })
    })
    const help = CliOutput.defaultFormatter({ colors: false }).formatHelpDoc(
      toImpl(command).buildHelpDoc(["app"])
    )
    const shortLine = help.split("\n").find((line) => line.includes("--short"))
    const wideLine = help.split("\n").find((line) => line.includes("--wide"))
    expect(shortLine).toBeDefined()
    expect(wideLine).toBeDefined()
    const offset = (line: string, flag: string) => CliOutput.displayWidth(line.slice(0, line.indexOf(flag)))
    expect(offset(shortLine!, "--short")).toBe(offset(wideLine!, "--wide"))
  })
})
