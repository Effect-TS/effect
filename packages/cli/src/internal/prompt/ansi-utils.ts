import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as Doc from "@effect/printer/Doc"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"

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
 * Moves the cursor to the specified `row` and `column`.
 *
 * Though the ANSI Control Sequence for Cursor Position is `1`-based, this
 * method takes row and column values starting from `0` and adjusts them to `1`-
 * based values.
 *
 * @internal
 */
export const cursorTo = (row: number, column: number = 0): AnsiDoc.AnsiDoc => {
  if (column === 0) {
    return Doc.text(`${CSI}${row + 1}G`)
  }
  return Doc.text(`${CSI}${column + 1};${row + 1}H`)
}

/**
 * Move the cursor position the specified number of `rows` and `columns`
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen in either direction, then
 * additional movement will have no effect.
 *
 * @internal
 */
export const cursorMove = (rows: number, columns: number = 0): AnsiDoc.AnsiDoc => {
  let move: AnsiDoc.AnsiDoc = Doc.empty
  if (rows > 0) {
    move = Doc.cat(move, cursorForward(rows))
  } else if (rows < 0) {
    move = Doc.cat(move, cursorBackward(-rows))
  }
  if (columns > 0) {
    move = Doc.cat(move, cursorDown(columns))
  } else if (columns < 0) {
    move = Doc.cat(move, cursorUp(-columns))
  }
  return move
}

/**
 * Moves the cursor up by the specified number of `rows` (default `1`) relative
 * to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @internal
 */
export const cursorUp = (rows: number = 1): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${rows}A`)

/**
 * Moves the cursor down by the specified number of `rows` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @internal
 */
export const cursorDown = (rows: number = 1): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${rows}B`)

/**
 * Moves the cursor backward by the specified number of `columns` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @internal
 */
export const cursorBackward = (columns: number = 1): AnsiDoc.AnsiDoc =>
  Doc.text(`${CSI}${columns}D`)

/**
 * Moves the cursor forward by the specified number of `columns` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @internal
 */
export const cursorForward = (columns: number = 1): AnsiDoc.AnsiDoc => Doc.text(`${CSI}${columns}C`)

/**
 * Moves the cursor to the first column.
 *
 * @internal
 */
export const cursorLeft: AnsiDoc.AnsiDoc = Doc.text(`${CSI}G`)

/**
 * Saves the cursor position, encoding shift state and formatting attributes.
 *
 * @internal
 */
export const cursorSave: AnsiDoc.AnsiDoc = Doc.text(`${ESC}7`)

/**
 * Restores the cursor position, encoding shift state and formatting attributes
 * from the previous save, if any, otherwise resets these all to their defaults.
 *
 * @internal
 */
export const cursorRestore: AnsiDoc.AnsiDoc = Doc.text(`${ESC}8`)

/**
 * Saves the current cursor position.
 *
 * @internal
 */
export const cursorSavePosition: AnsiDoc.AnsiDoc = Doc.text(`${ESC}s`)

/**
 * Restores the cursor position from the previous save.
 *
 * @internal
 */
export const cursorRestorePosition: AnsiDoc.AnsiDoc = Doc.text(`${ESC}u`)

/**
 * Reports the cursor position (CPR) by transmitting `ESC[n;mR`, where `n` is
 * the row and `m` is the column.
 *
 * @internal
 */
export const cursorGetPosition: AnsiDoc.AnsiDoc = Doc.text(`${ESC}6n`)

/**
 * Moves cursor to beginning of the line the specified number of rows down
 * (default `1`).
 *
 * @internal
 */
export const cursorNextLine = (rows: number = 1): AnsiDoc.AnsiDoc => Doc.text(`${ESC}${rows}E`)

/**
 * Moves cursor to beginning of the line the specified number of rows up
 * (default `1`).
 * @internal
 */
export const cursorPreviousLine = (rows: number = 1): AnsiDoc.AnsiDoc => Doc.text(`${ESC}${rows}F`)

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
 * Erases the entire current line. The cursor position does not change.
 *
 * @internal
 */
export const eraseLine: AnsiDoc.AnsiDoc = Doc.text(`${CSI}2K`)

/**
 * Erase from the current cursor position up the specified amount of rows.
 *
 * @internal
 */
export const eraseLines = (rows: number): AnsiDoc.AnsiDoc => {
  let clear: AnsiDoc.AnsiDoc = Doc.empty
  for (let i = 0; i < rows; i++) {
    clear = Doc.cat(clear, Doc.cat(eraseLine, i < rows - 1 ? cursorUp(1) : Doc.empty))
  }
  if (rows > 0) {
    clear = Doc.cat(clear, cursorLeft)
  }
  return clear
}

/**
 * Clears all lines taken up by the specified `text`.
 *
 * @internal
 */
export const eraseText = (text: string, columns: number): AnsiDoc.AnsiDoc => {
  if (columns === 0) {
    return Doc.cat(eraseLine, cursorTo(0))
  }
  let rows = 0
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    rows += 1 + Math.floor(Math.max(width(line) - 1, 0) / columns)
  }
  return eraseLines(rows)
}

/** @internal */
export const strip = (str: string) => {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
  ].join("|")
  const regex = new RegExp(pattern, "g")
  return str.replace(regex, "")
}

/** @internal */
export const width = (str: string) => [...strip(str)].length

/** @internal */
export const lines = (prompt: string, columns: number): number => {
  const lines = strip(prompt).split(/\r?\n/)
  return columns === 0
    ? lines.length
    : pipe(
      ReadonlyArray.map(lines, (line) => Math.ceil(line.length / columns)),
      ReadonlyArray.reduce(0, (left, right) => left + right)
    )
}
