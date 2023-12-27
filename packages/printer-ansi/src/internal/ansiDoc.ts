import * as Doc from "@effect/printer/Doc"
import type * as AnsiDoc from "../AnsiDoc.js"
import * as InternalAnsi from "./ansi.js"

/** @internal */
export const beep: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.beep)

/** @internal */
export const cursorTo = (column: number, row?: number): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorTo(column, row))

/** @internal */
export const cursorMove = (column: number, row?: number): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorMove(column, row))

/** @internal */
export const cursorUp = (lines: number = 1): AnsiDoc.AnsiDoc => Doc.annotate(Doc.empty, InternalAnsi.cursorUp(lines))

/** @internal */
export const cursorDown = (lines: number = 1): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorDown(lines))

/** @internal */
export const cursorForward = (columns: number = 1): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorForward(columns))

/** @internal */
export const cursorBackward = (columns: number = 1): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorBackward(columns))

/** @internal */
export const cursorLeft: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.cursorLeft)

/** @internal */
export const cursorSavePosition: AnsiDoc.AnsiDoc = Doc.annotate(
  Doc.empty,
  InternalAnsi.cursorSavePosition
)

/** @internal */
export const cursorRestorePosition: AnsiDoc.AnsiDoc = Doc.annotate(
  Doc.empty,
  InternalAnsi.cursorRestorePosition
)

/** @internal */
export const cursorNextLine = (rows: number = 1): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorNextLine(rows))

/** @internal */
export const cursorPrevLine = (rows: number = 1): AnsiDoc.AnsiDoc =>
  Doc.annotate(Doc.empty, InternalAnsi.cursorPrevLine(rows))

/** @internal */
export const cursorHide: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.cursorHide)

/** @internal */
export const cursorShow: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.cursorShow)

/** @internal */
export const eraseLines = (rows: number): AnsiDoc.AnsiDoc => Doc.annotate(Doc.empty, InternalAnsi.eraseLines(rows))

/** @internal */
export const eraseEndLine: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.eraseEndLine)

/** @internal */
export const eraseStartLine: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.eraseStartLine)

/** @internal */
export const eraseLine: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.eraseLine)

/** @internal */
export const eraseDown: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.eraseDown)

/** @internal */
export const eraseUp: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.eraseUp)

/** @internal */
export const eraseScreen: AnsiDoc.AnsiDoc = Doc.annotate(Doc.empty, InternalAnsi.eraseScreen)
