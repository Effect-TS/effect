export const doc = Doc.hsep([
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

console.log(doc.renderPrettyAnsiDefault)
