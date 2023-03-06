import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"

const doc = Doc.annotate(
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
console.log(AnsiRender.prettyDefault(doc))
