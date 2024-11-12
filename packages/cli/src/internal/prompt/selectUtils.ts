import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Arr from "effect/Array"
import type { Prompt } from "../../index.js"

export interface SelectOptions<A> extends Required<Prompt.Prompt.SelectOptions<A>> {}

export interface SelectMultiOptions extends Prompt.Prompt.SelectMultiOptions {}

export const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

export const NEWLINE_REGEX = /\r?\n/

export function renderOutput<A>(
  leadingSymbol: Doc.AnsiDoc,
  trailingSymbol: Doc.AnsiDoc,
  options: SelectOptions<A>
) {
  const annotateLine = (line: string): Doc.AnsiDoc => Doc.annotate(Doc.text(line), Ansi.bold)
  const prefix = Doc.cat(leadingSymbol, Doc.space)
  return Arr.match(options.message.split(NEWLINE_REGEX), {
    onEmpty: () => Doc.hsep([prefix, trailingSymbol]),
    onNonEmpty: (promptLines) => {
      const lines = Arr.map(promptLines, (line) => annotateLine(line))
      return prefix.pipe(
        Doc.cat(Doc.nest(Doc.vsep(lines), 2)),
        Doc.cat(Doc.space),
        Doc.cat(trailingSymbol),
        Doc.cat(Doc.space)
      )
    }
  })
}
