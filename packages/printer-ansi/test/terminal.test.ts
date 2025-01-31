import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Color from "@effect/printer-ansi/Color"
import { describe, expect, it } from "@effect/vitest"
import * as String from "effect/String"

const simple = Doc.text("foo")

const complex = Doc.hsep([
  Doc.text("red"),
  Doc.align(Doc.vsep([
    Doc.hsep([
      Doc.text("blue+u"),
      Doc.text("bold").pipe(Doc.annotate(Ansi.bold)),
      Doc.text("blue+u")
    ]).pipe(Doc.annotate(Ansi.combine(Ansi.color(Color.blue), Ansi.underlined))),
    Doc.text("red")
  ]))
]).pipe(Doc.annotate(Ansi.red))

const render = (doc: Doc.AnsiDoc): string => Doc.render(doc, { style: "pretty" })

describe("Terminal", () => {
  describe("Colors", () => {
    it("black", () => {
      expect(render(Doc.annotate(simple, Ansi.black))).toBe(
        "\u001b[0;30mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.blackBright))).toBe(
        "\u001b[0;90mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgBlack))).toBe(
        "\u001b[0;40mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgBlackBright))).toBe(
        "\u001b[0;100mfoo\u001b[0m"
      )
    })

    it("red", () => {
      expect(render(Doc.annotate(simple, Ansi.red))).toBe(
        "\u001b[0;31mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.redBright))).toBe(
        "\u001b[0;91mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgRed))).toBe(
        "\u001b[0;41mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgRedBright))).toBe(
        "\u001b[0;101mfoo\u001b[0m"
      )
    })

    it("green", () => {
      expect(render(Doc.annotate(simple, Ansi.green))).toBe(
        "\u001b[0;32mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.greenBright))).toBe(
        "\u001b[0;92mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgGreen))).toBe(
        "\u001b[0;42mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgGreenBright))).toBe(
        "\u001b[0;102mfoo\u001b[0m"
      )
    })

    it("yellow", () => {
      expect(render(Doc.annotate(simple, Ansi.yellow))).toBe(
        "\u001b[0;33mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.yellowBright))).toBe(
        "\u001b[0;93mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgYellow))).toBe(
        "\u001b[0;43mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgYellowBright))).toBe(
        "\u001b[0;103mfoo\u001b[0m"
      )
    })

    it("blue", () => {
      expect(render(Doc.annotate(simple, Ansi.blue))).toBe(
        "\u001b[0;34mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.blueBright))).toBe(
        "\u001b[0;94mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgBlue))).toBe(
        "\u001b[0;44mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgBlueBright))).toBe(
        "\u001b[0;104mfoo\u001b[0m"
      )
    })

    it("magenta", () => {
      expect(render(Doc.annotate(simple, Ansi.magenta))).toBe(
        "\u001b[0;35mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.magentaBright))).toBe(
        "\u001b[0;95mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgMagenta))).toBe(
        "\u001b[0;45mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgMagentaBright))).toBe(
        "\u001b[0;105mfoo\u001b[0m"
      )
    })

    it("cyan", () => {
      expect(render(Doc.annotate(simple, Ansi.cyan))).toBe(
        "\u001b[0;36mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.cyanBright))).toBe(
        "\u001b[0;96mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgCyan))).toBe(
        "\u001b[0;46mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgCyanBright))).toBe(
        "\u001b[0;106mfoo\u001b[0m"
      )
    })

    it("white", () => {
      expect(render(Doc.annotate(simple, Ansi.white))).toBe(
        "\u001b[0;37mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.whiteBright))).toBe(
        "\u001b[0;97mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgWhite))).toBe(
        "\u001b[0;47mfoo\u001b[0m"
      )
      expect(render(Doc.annotate(simple, Ansi.bgWhiteBright))).toBe(
        "\u001b[0;107mfoo\u001b[0m"
      )
    })
  })

  describe("Styles", () => {
    it("bold", () => {
      expect(render(Doc.annotate(simple, Ansi.bold))).toBe(
        "\u001b[0;1mfoo\u001b[0m"
      )
    })

    it("italicized", () => {
      expect(render(Doc.annotate(simple, Ansi.italicized))).toBe(
        "\u001b[0;3mfoo\u001b[0m"
      )
    })

    it("strikethrough", () => {
      expect(render(Doc.annotate(simple, Ansi.strikethrough))).toBe(
        "\u001b[0;9mfoo\u001b[0m"
      )
    })

    it("underlined", () => {
      expect(render(Doc.annotate(simple, Ansi.underlined))).toBe(
        "\u001b[0;4mfoo\u001b[0m"
      )
    })
  })

  describe("Commands", () => {
    it("should render a beep", () => {
      expect(render(Doc.beep)).toBe("\u001b[0m\u0007\u001b[0m")
    })

    it("should move the cursor to the specified row and column", () => {
      expect(render(Doc.cursorTo(1))).toBe("\u001b[0m\u001b[2G\u001b[0m")
      expect(render(Doc.cursorTo(1, 1))).toBe("\u001b[0m\u001b[2;2H\u001b[0m")
    })

    it("should move the cursor to the specified row and column relative to the current cursor position", () => {
      expect(render(Doc.cursorMove(1))).toBe(
        "\u001b[0m\u001b[1C\u001b[0m"
      )
      expect(render(Doc.cursorMove(1, 1))).toBe(
        "\u001b[0m\u001b[1B\u001b[1C\u001b[0m"
      )
    })

    it("should move the cursor up by the specified number of lines", () => {
      expect(render(Doc.cursorUp(2))).toBe("\u001b[0m\u001b[2A\u001b[0m")
    })

    it("should move the cursor down by the specified number of lines", () => {
      expect(render(Doc.cursorDown(2))).toBe("\u001b[0m\u001b[2B\u001b[0m")
    })

    it("should move the cursor forward by the specified number of columns", () => {
      expect(render(Doc.cursorForward(2))).toBe("\u001b[0m\u001b[2C\u001b[0m")
    })

    it("should move the cursor backward by the specified number of columns", () => {
      expect(render(Doc.cursorBackward(2))).toBe("\u001b[0m\u001b[2D\u001b[0m")
    })

    it("should move the cursor all the way to the left", () => {
      expect(render(Doc.cursorLeft)).toBe("\u001b[0m\u001b[G\u001b[0m")
    })

    it("should save the current cursor position", () => {
      expect(render(Doc.cursorSavePosition)).toBe("\u001b[0m\u001b[s\u001b[0m")
    })

    it("should restore the current cursor position", () => {
      expect(render(Doc.cursorRestorePosition)).toBe("\u001b[0m\u001b[u\u001b[0m")
    })

    it("should move the cursor down to the beginning of the next row specified", () => {
      expect(render(Doc.cursorNextLine())).toBe("\u001b[0m\u001b[1E\u001b[0m")
      expect(render(Doc.cursorNextLine(2))).toBe("\u001b[0m\u001b[2E\u001b[0m")
    })

    it("should move the cursor up to the beginning of the previous row specified", () => {
      expect(render(Doc.cursorPrevLine())).toBe("\u001b[0m\u001b[1F\u001b[0m")
      expect(render(Doc.cursorPrevLine(2))).toBe("\u001b[0m\u001b[2F\u001b[0m")
    })

    it("should hide the cursor", () => {
      expect(render(Doc.cursorHide)).toBe("\u001b[0m\u001b[?25l\u001b[0m")
    })

    it("should show the cursor", () => {
      expect(render(Doc.cursorShow)).toBe("\u001b[0m\u001b[?25h\u001b[0m")
    })

    it("should erase the specified number of rows above the current cursor", () => {
      expect(render(Doc.eraseLines(2))).toBe(
        "\u001b[0m\u001b[2K\u001b[1A\u001b[2K\u001b[G\u001b[0m"
      )
    })

    it("should erase from the current cursor position to the end of the current line", () => {
      expect(render(Doc.eraseEndLine)).toBe(
        "\u001b[0m\u001b[K\u001b[0m"
      )
    })

    it("should erase from the current cursor position to the beginning of the current line", () => {
      expect(render(Doc.eraseStartLine)).toBe(
        "\u001b[0m\u001b[1K\u001b[0m"
      )
    })

    it("should erase the current line", () => {
      expect(render(Doc.eraseLine)).toBe(
        "\u001b[0m\u001b[2K\u001b[0m"
      )
    })

    it("should erase from the current cursor position to the end of the screen", () => {
      expect(render(Doc.eraseDown)).toBe(
        "\u001b[0m\u001b[J\u001b[0m"
      )
    })

    it("should erase from the current cursor position to the beginning of the screen", () => {
      expect(render(Doc.eraseUp)).toBe(
        "\u001b[0m\u001b[1J\u001b[0m"
      )
    })

    it("should erase the entire screen", () => {
      expect(render(Doc.eraseScreen)).toBe(
        "\u001b[0m\u001b[2J\u001b[0m"
      )
    })
  })

  describe("Complex Example", () => {
    it("should combine annotations appropriately", () => {
      expect(render(complex)).toBe(String.stripMargin(
        `|\u001b[0;31mred \u001b[0;34;4mblue+u \u001b[0;34;1;4mbold\u001b[0;34;4m blue+u\u001b[0;31m
         |    red\u001b[0m`
      ))
    })
  })

  describe("Annotations", () => {
    it("should re-annotate a document", () => {
      const doc = Doc.map(complex, (style) => Ansi.combine(Ansi.bgColor(Color.white), style))
      expect(render(doc)).toBe(String.stripMargin(
        `|\u001b[0;31;47mred \u001b[0;34;47;4mblue+u \u001b[0;34;47;1;4mbold\u001b[0;34;47;4m blue+u\u001b[0;31;47m
          |    red\u001b[0m`
      ))
    })

    it("should alter existing annotations", () => {
      const doc = Doc.alterAnnotations(complex, () => [Ansi.bold, Ansi.color(Color.green)])
      expect(render(doc)).toBe(String.stripMargin(
        `|\u001b[0;1m\u001b[0;32;1mred \u001b[0;32;1m\u001b[0;32;1mblue+u \u001b[0;32;1m\u001b[0;32;1mbold\u001b[0;1m\u001b[0;32m blue+u\u001b[0;1m\u001b[0;32m
         |    red\u001b[0;1m\u001b[0m`
      ))
    })

    it("should remove all annotations", () => {
      const doc = Doc.unAnnotate(complex)
      expect(render(doc)).toBe(String.stripMargin(
        `|red blue+u bold blue+u
         |    red`
      ))
    })
  })
})
