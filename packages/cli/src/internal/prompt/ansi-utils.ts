import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as Doc from "@effect/printer/Doc"
import { Effect } from "effect"

const defaultFigures = {
  arrowUp: Doc.text("↑"),
  arrowDown: Doc.text("↓"),
  arrowLeft: Doc.text("←"),
  arrowRight: Doc.text("→"),
  radioOn: Doc.text("◉"),
  radioOff: Doc.text("◯"),
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

const BEEP = "\x07"
const ESC = "\x1B"
const CSI = `${ESC}[`

/**
 * Play a beeping sound.
 *
 * @internal
 */
export const beep: AnsiDoc.AnsiDoc = Doc.char(BEEP)

/**
 * Clear from cursor to beginning of the screen.
 *
 * @internal
 */
export const clearUp: AnsiDoc.AnsiDoc = Doc.text(`${CSI}1J`)

/**
 * Clear from cursor to end of screen.
 *
 * @internal
 */
export const clearDown: AnsiDoc.AnsiDoc = Doc.text(`${CSI}J`)

/**
 * Clear from cursor to the start of the line. Cursor position does not change.
 *
 * @internal
 */
export const clearLeft: AnsiDoc.AnsiDoc = Doc.text(`${CSI}$1K`)

/**
 * Clear from cursor to the end of the line. Cursor position does not change.
 *
 * @internal
 */
export const clearRight: AnsiDoc.AnsiDoc = Doc.text(`${CSI}K`)

/**
 * Clear entire screen. And moves cursor to upper left on DOS.
 *
 * @internal
 */
export const clearScreen: AnsiDoc.AnsiDoc = Doc.text(`${CSI}2J`)

/**
 * Clear the current line. Cursor position does not change.
 *
 * @internal
 */
export const clearLine: AnsiDoc.AnsiDoc = Doc.text(`${CSI}2K`)

/**
 * Sets the cursor position to the absolute coordinates `x` and `y`.
 *
 * @internal
 */
export const setCursorPosition = (x: number, y?: number): AnsiDoc.AnsiDoc => {
  if (y === undefined) {
    return Doc.text(`${CSI}${x + 1}G`)
  }
  return Doc.text(`${CSI}${y + 1};${x + 1}H`)
}

/**
 * Clears the current line and resets the cursor position to the beginning of
 * the line.
 *
 * @internal
 */
export const resetLine: AnsiDoc.AnsiDoc = Doc.cat(clearLine, setCursorPosition(0))

const strip = (str: string) => {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
  ].join("|")
  const regex = new RegExp(pattern, "g")
  return str.replace(regex, "")
}

const width = (str: string) => [...strip(str)].length

/**
 * @internal
 */
export const resetLines = (prompt: string, perLine?: number) => {
  if (!perLine) {
    return resetLine
  }
  let rows = 0
  const lines = prompt.split(/\r?\n/)
  for (const line of lines) {
    rows += 1 + Math.floor(Math.max(width(line) - 1, 0) / perLine)
  }
  return clearLines(rows)
}

/**
 * Clears from the cursor to the end of the screen and resets the cursor
 * position to the beginning of the line.
 *
 * @internal
 */
export const resetDown: AnsiDoc.AnsiDoc = Doc.cat(clearDown, setCursorPosition(0))

/**
 * Clear the specified number of lines.
 *
 * @internal
 */
export const clearLines = (lines: number): AnsiDoc.AnsiDoc => {
  let clear: AnsiDoc.AnsiDoc = Doc.empty
  for (let i = 0; i < lines; i++) {
    clear = Doc.cat(clear, Doc.cat(clearLine, i < lines - 1 ? moveCursorUp(1) : Doc.empty))
  }
  if (lines > 0) {
    clear = Doc.cat(clear, moveCursorLeft(1))
  }
  return clear
}

/**
 * Hides the cursor.
 *
 * @internal
 */
export const cursorHide: AnsiDoc.AnsiDoc = Doc.text(`${CSI}?25l`)

/**
 * Shows the cursor.
 *
 * @internal
 */
export const cursorShow: AnsiDoc.AnsiDoc = Doc.text(`${CSI}?25h`)

/**
 * Saves the position of the cursor.
 *
 * @internal
 */
export const cursorSave: AnsiDoc.AnsiDoc = Doc.text(`${ESC}7`)

/**
 * Saves the position of the cursor.
 *
 * @internal
 */
export const cursorRestore: AnsiDoc.AnsiDoc = Doc.text(`${ESC}8`)

/**
 * Move the cursor up by the specified number of `lines`.
 *
 * @internal
 */
export const moveCursorUp = (lines: number): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${lines}A`)

/**
 * Move the cursor down by the specified number of `lines`.
 *
 * @internal
 */
export const moveCursorDown = (lines: number): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${lines}B`)

/**
 * Move the cursor left by the specified number of `columns`.
 *
 * @internal
 */
export const moveCursorLeft = (columns: number): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${columns}D`)
/**
 * Move the cursor right by the specified number of `columns`.
 *
 * @internal
 */
export const moveCursorRight = (columns: number): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${columns}C`)

/**
 * Move the cursor position by the relative coordinates `x` and `y`.
 *
 * @internal
 */
export const moveCursor = (x: number, y = 0): AnsiDoc.AnsiDoc => {
  let move: AnsiDoc.AnsiDoc = Doc.empty
  if (x > 0) {
    move = Doc.cat(move, moveCursorRight(x))
  } else if (x < 0) {
    move = Doc.cat(move, moveCursorLeft(-x))
  }
  if (y > 0) {
    move = Doc.cat(move, moveCursorDown(y))
  } else if (y < 0) {
    move = Doc.cat(move, moveCursorUp(-y))
  }
  return move
}
