import { afterEach, assert, beforeEach, describe, it, vitest } from "@effect/vitest"
import * as Ansi from "effect/cli/internal/ansi"
import * as Wizard from "effect/cli/internal/wizard"

describe("Ansi", { concurrent: false }, () => {
  beforeEach(() => vitest.stubEnv("NO_COLOR", ""))
  afterEach(() => vitest.unstubAllEnvs())

  it("does not reset text when no style is applied", () => {
    assert.strictEqual(Ansi.annotate("plain", "", [""]), "plain")
  })

  it("suppresses wizard colors for a non-empty NO_COLOR value", () => {
    vitest.stubEnv("NO_COLOR", "1")
    const output = Wizard.renderIntroduction("app", "1.0.0", undefined) +
      Wizard.renderCompletion(["app", "--name", "Alice"]) + Wizard.renderQuit()
    assert.notMatch(output, /\[(?:3\d|9\d)m/)
    assert.include(output, Ansi.bold)
    assert.include(output, "Wizard cancelled.")
  })

  it("retains wizard colors for an empty NO_COLOR value", () => {
    vitest.stubEnv("NO_COLOR", "")
    assert.include(Wizard.renderIntroduction("app", "1.0.0", undefined), Ansi.cyanBright)
  })

  it("emits a standard CSI horizontal absolute sequence", () => {
    assert.strictEqual(Ansi.cursorTo(0), "\x1b[1G")
  })

  it("emits a standard CSI cursor-position sequence", () => {
    assert.strictEqual(Ansi.cursorTo(2, 3), "\x1b[4;3H")
  })
})
