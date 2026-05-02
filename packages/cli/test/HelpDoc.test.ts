import * as HelpDoc from "@effect/cli/HelpDoc"
import * as Span from "@effect/cli/HelpDoc/Span"
import * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import { describe, expect, it } from "@effect/vitest"

describe("HelpDoc", () => {
  describe("toAnsiDoc", () => {
    it("Weak spans use bright black (dark gray), not black, so they are readable on dark terminals", () => {
      const span = Span.weak("name")
      const ansiDoc = HelpDoc.toAnsiDoc(HelpDoc.p(span))
      const rendered = AnsiDoc.render(ansiDoc, { style: "pretty" })
      // ANSI foreground code 30 = black — invisible on dark/black terminal backgrounds.
      // Weak spans must not produce this code.
      expect(rendered).not.toMatch(/\x1b\[[0-9;]*30[;m]/)
    })
  })
})
