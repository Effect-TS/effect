import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

const defaultFigures = {
  arrowUp: Doc.text("↑"),
  arrowDown: Doc.text("↓"),
  arrowLeft: Doc.text("←"),
  arrowRight: Doc.text("→"),
  radioOn: Doc.text("◉"),
  radioOff: Doc.text("◯"),
  checkboxOn: Doc.text("☒"),
  checkboxOff: Doc.text("☐"),
  tick: Doc.text("✔"),
  cross: Doc.text("✖"),
  ellipsis: Doc.text("…"),
  pointerSmall: Doc.text("›"),
  line: Doc.text("─"),
  pointer: Doc.text("❯")
}

const windowsFigures = {
  arrowUp: defaultFigures.arrowUp,
  arrowDown: defaultFigures.arrowDown,
  arrowLeft: defaultFigures.arrowLeft,
  arrowRight: defaultFigures.arrowRight,
  radioOn: Doc.text("(*)"),
  radioOff: Doc.text("( )"),
  checkboxOn: Doc.text("[*]"),
  checkboxOff: Doc.text("[ ]"),
  tick: Doc.text("√"),
  cross: Doc.text("×"),
  ellipsis: Doc.text("..."),
  pointerSmall: Doc.text("»"),
  line: Doc.text("─"),
  pointer: Doc.text(">")
}

/** @internal */
export const figures = Effect.map(
  Effect.sync(() => process.platform === "win32"),
  (isWindows) => isWindows ? windowsFigures : defaultFigures
)

/**
 * Clears all lines taken up by the specified `text`.
 *
 * @internal
 */
export function eraseText(text: string, columns: number): Doc.AnsiDoc {
  if (columns === 0) {
    return Doc.cat(Doc.eraseLine, Doc.cursorTo(0))
  }
  let rows = 0
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    rows += 1 + Math.floor(Math.max(line.length - 1, 0) / columns)
  }
  return Doc.eraseLines(rows)
}

/** @internal */
export function lines(prompt: string, columns: number): number {
  const lines = prompt.split(/\r?\n/)
  return columns === 0
    ? lines.length
    : pipe(
      Arr.map(lines, (line) => Math.ceil(line.length / columns)),
      Arr.reduce(0, (left, right) => left + right)
    )
}
