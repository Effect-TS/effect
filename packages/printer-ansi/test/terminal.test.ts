import * as String from "@fp-ts/data/String"

export const complex = Doc.hsep([
  Doc.text("red"),
  Doc.vsep([
    Doc.hsep([
      Doc.text("blue+u"),
      Doc.text("bold").annotate(
        AnsiStyle.Semigroup.combine(AnsiStyle.bold)(AnsiStyle.color(Color.Blue))
      ),
      Doc.text("blue+u")
    ]).annotate(
      AnsiStyle.Semigroup.combine(AnsiStyle.underlined)(AnsiStyle.color(Color.Blue))
    ),
    Doc.text("red")
  ]).align
]).annotate(
  AnsiStyle.color(Color.Red)
)

describe.concurrent("Terminal", () => {
  describe.concurrent("Colors/Layers", () => {
    function foreground(color: Color): AnsiDoc {
      return Doc.text("foo").annotate(AnsiStyle.color(color))
    }

    function dullForeground(color: Color): AnsiDoc {
      return Doc.text("foo").annotate(AnsiStyle.dullColor(color))
    }

    function background(color: Color): AnsiDoc {
      return Doc.text("foo").annotate(AnsiStyle.backgroundColor(color))
    }

    function dullBackground(color: Color): AnsiDoc {
      return Doc.text("foo").annotate(AnsiStyle.dullBackgroundColor(color))
    }

    it("black", () => {
      assert.strictEqual(foreground(Color.Black).renderPrettyAnsiDefault, "\u001b[0;90mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Black).renderPrettyAnsiDefault, "\u001b[0;30mfoo\u001b[0m")
      assert.strictEqual(background(Color.Black).renderPrettyAnsiDefault, "\u001b[0;100mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Black).renderPrettyAnsiDefault, "\u001b[0;40mfoo\u001b[0m")
    })

    it("red", () => {
      assert.strictEqual(foreground(Color.Red).renderPrettyAnsiDefault, "\u001b[0;91mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Red).renderPrettyAnsiDefault, "\u001b[0;31mfoo\u001b[0m")
      assert.strictEqual(background(Color.Red).renderPrettyAnsiDefault, "\u001b[0;101mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Red).renderPrettyAnsiDefault, "\u001b[0;41mfoo\u001b[0m")
    })

    it("green", () => {
      assert.strictEqual(foreground(Color.Green).renderPrettyAnsiDefault, "\u001b[0;92mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Green).renderPrettyAnsiDefault, "\u001b[0;32mfoo\u001b[0m")
      assert.strictEqual(background(Color.Green).renderPrettyAnsiDefault, "\u001b[0;102mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Green).renderPrettyAnsiDefault, "\u001b[0;42mfoo\u001b[0m")
    })

    it("yellow", () => {
      assert.strictEqual(foreground(Color.Yellow).renderPrettyAnsiDefault, "\u001b[0;93mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Yellow).renderPrettyAnsiDefault, "\u001b[0;33mfoo\u001b[0m")
      assert.strictEqual(background(Color.Yellow).renderPrettyAnsiDefault, "\u001b[0;103mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Yellow).renderPrettyAnsiDefault, "\u001b[0;43mfoo\u001b[0m")
    })

    it("blue", () => {
      assert.strictEqual(foreground(Color.Blue).renderPrettyAnsiDefault, "\u001b[0;94mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Blue).renderPrettyAnsiDefault, "\u001b[0;34mfoo\u001b[0m")
      assert.strictEqual(background(Color.Blue).renderPrettyAnsiDefault, "\u001b[0;104mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Blue).renderPrettyAnsiDefault, "\u001b[0;44mfoo\u001b[0m")
    })

    it("magenta", () => {
      assert.strictEqual(foreground(Color.Magenta).renderPrettyAnsiDefault, "\u001b[0;95mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Magenta).renderPrettyAnsiDefault, "\u001b[0;35mfoo\u001b[0m")
      assert.strictEqual(background(Color.Magenta).renderPrettyAnsiDefault, "\u001b[0;105mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Magenta).renderPrettyAnsiDefault, "\u001b[0;45mfoo\u001b[0m")
    })

    it("cyan", () => {
      assert.strictEqual(foreground(Color.Cyan).renderPrettyAnsiDefault, "\u001b[0;96mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.Cyan).renderPrettyAnsiDefault, "\u001b[0;36mfoo\u001b[0m")
      assert.strictEqual(background(Color.Cyan).renderPrettyAnsiDefault, "\u001b[0;106mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.Cyan).renderPrettyAnsiDefault, "\u001b[0;46mfoo\u001b[0m")
    })

    it("white", () => {
      assert.strictEqual(foreground(Color.White).renderPrettyAnsiDefault, "\u001b[0;97mfoo\u001b[0m")
      assert.strictEqual(dullForeground(Color.White).renderPrettyAnsiDefault, "\u001b[0;37mfoo\u001b[0m")
      assert.strictEqual(background(Color.White).renderPrettyAnsiDefault, "\u001b[0;107mfoo\u001b[0m")
      assert.strictEqual(dullBackground(Color.White).renderPrettyAnsiDefault, "\u001b[0;47mfoo\u001b[0m")
    })
  })

  describe.concurrent("Underlined", () => {
    it("underlined", () => {
      assert.strictEqual(
        Doc.text("foo").annotate(AnsiStyle.underlined).renderPrettyAnsiDefault,
        "\u001b[0;4mfoo\u001b[0m"
      )
    })
  })

  describe.concurrent("Bold", () => {
    it("bold", () => {
      assert.strictEqual(
        Doc.text("foo").annotate(AnsiStyle.bold).renderPrettyAnsiDefault,
        "\u001b[0;1mfoo\u001b[0m"
      )
    })
  })

  describe.concurrent("Complex Example", () => {
    it("should combine annotations appropriately", () => {
      assert.strictEqual(
        complex.renderPrettyAnsiDefault,
        String.stripMargin(
          `|\u001b[0;91mred \u001b[0;94;4mblue+u \u001b[0;94;1;4mbold\u001b[0;94;4m blue+u\u001b[0;91m
           |    red\u001b[0m`
        )
      )
    })
  })

  describe.concurrent("Annotations", () => {
    it("should re-annotate a document", () => {
      const result = complex
        .map((style) => AnsiStyle.Semigroup.combine(style)(AnsiStyle.backgroundColor(Color.White)))
        .renderPrettyAnsiDefault

      assert.strictEqual(
        result,
        String.stripMargin(
          `|\u001b[0;91;107mred \u001b[0;94;107;4mblue+u \u001b[0;94;107;1;4mbold\u001b[0;94;107;4m blue+u\u001b[0;91;107m
           |    red\u001b[0m`
        )
      )
    })

    it("should alter existing annotations", () => {
      const altered = complex.alterAnnotations(() => [AnsiStyle.bold, AnsiStyle.color(Color.Green)])
        .renderPrettyAnsiDefault

      assert.strictEqual(
        altered,
        String.stripMargin(
          `|\u001b[0;1m\u001b[0;92;1mred \u001b[0;92;1m\u001b[0;92;1mblue+u \u001b[0;92;1m\u001b[0;92;1mbold\u001b[0;1m\u001b[0;92m blue+u\u001b[0;1m\u001b[0;92m
           |    red\u001b[0;1m\u001b[0m`
        )
      )
    })

    it("should remove all annotations", () => {
      assert.strictEqual(
        complex.unAnnotate.renderPrettyAnsiDefault,
        String.stripMargin(
          `|red blue+u bold blue+u
           |    red`
        )
      )
    })
  })
})
