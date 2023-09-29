import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import * as String from "effect/String"
import { describe, expect, it } from "vitest"

export const complex = Doc.annotate(
  Doc.hsep([
    Doc.text("red"),
    Doc.align(
      Doc.vsep([
        Doc.annotate(
          Doc.hsep([
            Doc.text("blue+u"),
            Doc.annotate(
              Doc.text("bold"),
              AnsiStyle.combine(AnsiStyle.color(Color.blue), AnsiStyle.bold)
            ),
            Doc.text("blue+u")
          ]),
          AnsiStyle.combine(AnsiStyle.color(Color.blue), AnsiStyle.underlined)
        ),
        Doc.text("red")
      ])
    )
  ]),
  AnsiStyle.color(Color.red)
)

describe.concurrent("Terminal", () => {
  describe.concurrent("Colors/Layers", () => {
    const foreground = (color: Color.Color): AnsiDoc.AnsiDoc => Doc.annotate(Doc.text("foo"), AnsiStyle.color(color))

    const dullForeground = (color: Color.Color): AnsiDoc.AnsiDoc =>
      Doc.annotate(Doc.text("foo"), AnsiStyle.dullColor(color))

    const background = (color: Color.Color): AnsiDoc.AnsiDoc =>
      Doc.annotate(Doc.text("foo"), AnsiStyle.backgroundColor(color))

    const dullBackground = (color: Color.Color): AnsiDoc.AnsiDoc =>
      Doc.annotate(Doc.text("foo"), AnsiStyle.dullBackgroundColor(color))

    it("black", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.black))).toBe("\u001b[0;90mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.black))).toBe("\u001b[0;30mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.black))).toBe("\u001b[0;100mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.black))).toBe("\u001b[0;40mfoo\u001b[0m")
    })

    it("red", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.red))).toBe("\u001b[0;91mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.red))).toBe("\u001b[0;31mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.red))).toBe("\u001b[0;101mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.red))).toBe("\u001b[0;41mfoo\u001b[0m")
    })

    it("green", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.green))).toBe("\u001b[0;92mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.green))).toBe("\u001b[0;32mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.green))).toBe("\u001b[0;102mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.green))).toBe("\u001b[0;42mfoo\u001b[0m")
    })

    it("yellow", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.yellow))).toBe("\u001b[0;93mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.yellow))).toBe("\u001b[0;33mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.yellow))).toBe("\u001b[0;103mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.yellow))).toBe("\u001b[0;43mfoo\u001b[0m")
    })

    it("blue", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.blue))).toBe("\u001b[0;94mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.blue))).toBe("\u001b[0;34mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.blue))).toBe("\u001b[0;104mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.blue))).toBe("\u001b[0;44mfoo\u001b[0m")
    })

    it("magenta", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.magenta))).toBe("\u001b[0;95mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.magenta))).toBe("\u001b[0;35mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.magenta))).toBe("\u001b[0;105mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.magenta))).toBe("\u001b[0;45mfoo\u001b[0m")
    })

    it("cyan", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.cyan))).toBe("\u001b[0;96mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.cyan))).toBe("\u001b[0;36mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.cyan))).toBe("\u001b[0;106mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.cyan))).toBe("\u001b[0;46mfoo\u001b[0m")
    })

    it("white", () => {
      expect(AnsiRender.prettyDefault(foreground(Color.white))).toBe("\u001b[0;97mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullForeground(Color.white))).toBe("\u001b[0;37mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(background(Color.white))).toBe("\u001b[0;107mfoo\u001b[0m")
      expect(AnsiRender.prettyDefault(dullBackground(Color.white))).toBe("\u001b[0;47mfoo\u001b[0m")
    })
  })

  describe.concurrent("Underlined", () => {
    it("underlined", () => {
      const doc = Doc.annotate(Doc.text("foo"), AnsiStyle.underlined)
      expect(AnsiRender.prettyDefault(doc)).toBe("\u001b[0;4mfoo\u001b[0m")
    })
  })

  describe.concurrent("Bold", () => {
    it("bold", () => {
      const doc = Doc.annotate(Doc.text("foo"), AnsiStyle.bold)
      expect(AnsiRender.prettyDefault(doc)).toBe("\u001b[0;1mfoo\u001b[0m")
    })
  })

  describe.concurrent("Complex Example", () => {
    it("should combine annotations appropriately", () => {
      expect(AnsiRender.prettyDefault(complex)).toBe(String.stripMargin(
        `|\u001b[0;91mred \u001b[0;94;4mblue+u \u001b[0;94;1;4mbold\u001b[0;94;4m blue+u\u001b[0;91m
         |    red\u001b[0m`
      ))
    })
  })

  describe.concurrent("Annotations", () => {
    it("should re-annotate a document", () => {
      const doc = Doc.map(complex, (style) => AnsiStyle.combine(AnsiStyle.backgroundColor(Color.white), style))
      expect(AnsiRender.prettyDefault(doc)).toBe(String.stripMargin(
        `|\u001b[0;91;107mred \u001b[0;94;107;4mblue+u \u001b[0;94;107;1;4mbold\u001b[0;94;107;4m blue+u\u001b[0;91;107m
         |    red\u001b[0m`
      ))
    })

    it("should alter existing annotations", () => {
      const doc = Doc.alterAnnotations(complex, () => [AnsiStyle.bold, AnsiStyle.color(Color.green)])
      expect(AnsiRender.prettyDefault(doc)).toBe(String.stripMargin(
        `|\u001b[0;1m\u001b[0;92;1mred \u001b[0;92;1m\u001b[0;92;1mblue+u \u001b[0;92;1m\u001b[0;92;1mbold\u001b[0;1m\u001b[0;92m blue+u\u001b[0;1m\u001b[0;92m
         |    red\u001b[0;1m\u001b[0m`
      ))
    })

    it("should remove all annotations", () => {
      const doc = Doc.unAnnotate(complex)
      expect(AnsiRender.prettyDefault(doc)).toBe(String.stripMargin(
        `|red blue+u bold blue+u
         |    red`
      ))
    })
  })
})
