import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"

const doc = Doc.hsep([
  Doc.text("red"),
  Doc.align(Doc.vsep([
    Doc.hsep([
      Doc.text("blue+u"),
      Doc.text("bold").pipe(Doc.annotate(Ansi.bold)),
      Doc.text("blue+u")
    ]).pipe(Doc.annotate(Ansi.combine(Ansi.blue, Ansi.underlined))),
    Doc.text("red")
  ]))
]).pipe(Doc.annotate(Ansi.red))

console.log(Doc.render(doc, { style: "pretty" }))
