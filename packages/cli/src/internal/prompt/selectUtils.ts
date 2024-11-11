import * as Terminal from "@effect/platform/Terminal"
import { Optimize } from "@effect/printer"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import type { Prompt } from "../../index.js"
import * as InternalAnsiUtils from "./ansi-utils.js"

export interface SelectOptions<A> extends Required<Prompt.Prompt.SelectOptions<A>> {}

export interface SelectMultiOptions extends Prompt.Prompt.SelectMultiOptions {}

export const renderBeep = Doc.render(Doc.beep, { style: "pretty" })

export function handleClear<A>(options: SelectOptions<A>) {
  return Effect.gen(function*() {
    const terminal = yield* Terminal.Terminal
    const columns = yield* terminal.columns
    const clearPrompt = Doc.cat(Doc.eraseLine, Doc.cursorLeft)
    const text = "\n".repeat(Math.min(options.choices.length, options.maxPerPage)) + options.message
    const clearOutput = InternalAnsiUtils.eraseText(text, columns)
    return clearOutput.pipe(
      Doc.cat(clearPrompt),
      Optimize.optimize(Optimize.Deep),
      Doc.render({ style: "pretty", options: { lineWidth: columns } })
    )
  })
}

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
