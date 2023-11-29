/**
 * @since 1.0.0
 */
import type { Color } from "./Color.js"
import * as InternalAnsi from "./internal/ansi.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category symbol
 */
export const AnsiTypeId: unique symbol = InternalAnsi.AnsiTypeId as AnsiTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type AnsiTypeId = typeof AnsiTypeId

/**
 * @since 1.0.0
 * @category model
 */
export interface Ansi extends Ansi.Proto {}

/**
 * @since 1.0.0
 */
export declare namespace Ansi {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Proto {
    readonly [AnsiTypeId]: AnsiTypeId
  }
}

// -----------------------------------------------------------------------------
// Style Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const bold: Ansi = InternalAnsi.bold

/**
 * @since 1.0.0
 * @category constructors
 */
export const italicized: Ansi = InternalAnsi.italicized

/**
 * @since 1.0.0
 * @category constructors
 */
export const strikethrough: Ansi = InternalAnsi.strikethrough

/**
 * @since 1.0.0
 * @category constructors
 */
export const underlined: Ansi = InternalAnsi.underlined

// -----------------------------------------------------------------------------
// Color Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const color: (color: Color) => Ansi = InternalAnsi.color

/**
 * @since 1.0.0
 * @category constructors
 */
export const brightColor: (color: Color) => Ansi = InternalAnsi.brightColor

/**
 * @since 1.0.0
 * @category constructors
 */
export const bgColor: (color: Color) => Ansi = InternalAnsi.bgColor

/**
 * @since 1.0.0
 * @category constructors
 */
export const bgColorBright: (color: Color) => Ansi = InternalAnsi.bgColorBright

/**
 * @since 1.0.0
 * @category colors
 */
export const black: Ansi = InternalAnsi.black

/**
 * @since 1.0.0
 * @category colors
 */
export const red: Ansi = InternalAnsi.red

/**
 * @since 1.0.0
 * @category colors
 */
export const green: Ansi = InternalAnsi.green

/**
 * @since 1.0.0
 * @category colors
 */
export const yellow: Ansi = InternalAnsi.yellow

/**
 * @since 1.0.0
 * @category colors
 */
export const blue: Ansi = InternalAnsi.blue

/**
 * @since 1.0.0
 * @category colors
 */
export const magenta: Ansi = InternalAnsi.magenta

/**
 * @since 1.0.0
 * @category colors
 */
export const cyan: Ansi = InternalAnsi.cyan

/**
 * @since 1.0.0
 * @category colors
 */
export const white: Ansi = InternalAnsi.white

/**
 * @since 1.0.0
 * @category colors
 */
export const blackBright: Ansi = InternalAnsi.blackBright

/**
 * @since 1.0.0
 * @category colors
 */
export const redBright: Ansi = InternalAnsi.redBright

/**
 * @since 1.0.0
 * @category colors
 */
export const greenBright: Ansi = InternalAnsi.greenBright

/**
 * @since 1.0.0
 * @category colors
 */
export const yellowBright: Ansi = InternalAnsi.yellowBright

/**
 * @since 1.0.0
 * @category colors
 */
export const blueBright: Ansi = InternalAnsi.blueBright

/**
 * @since 1.0.0
 * @category colors
 */
export const magentaBright: Ansi = InternalAnsi.magentaBright

/**
 * @since 1.0.0
 * @category colors
 */
export const cyanBright: Ansi = InternalAnsi.cyanBright

/**
 * @since 1.0.0
 * @category colors
 */
export const whiteBright: Ansi = InternalAnsi.whiteBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgBlack: Ansi = InternalAnsi.bgBlack

/**
 * @since 1.0.0
 * @category colors
 */
export const bgRed: Ansi = InternalAnsi.bgRed

/**
 * @since 1.0.0
 * @category colors
 */
export const bgGreen: Ansi = InternalAnsi.bgGreen

/**
 * @since 1.0.0
 * @category colors
 */
export const bgYellow: Ansi = InternalAnsi.bgYellow

/**
 * @since 1.0.0
 * @category colors
 */
export const bgBlue: Ansi = InternalAnsi.bgBlue

/**
 * @since 1.0.0
 * @category colors
 */
export const bgMagenta: Ansi = InternalAnsi.bgMagenta

/**
 * @since 1.0.0
 * @category colors
 */
export const bgCyan: Ansi = InternalAnsi.bgCyan

/**
 * @since 1.0.0
 * @category colors
 */
export const bgWhite: Ansi = InternalAnsi.bgWhite

/**
 * @since 1.0.0
 * @category colors
 */
export const bgBlackBright: Ansi = InternalAnsi.bgBlackBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgRedBright: Ansi = InternalAnsi.bgRedBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgGreenBright: Ansi = InternalAnsi.bgGreenBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgYellowBright: Ansi = InternalAnsi.bgYellowBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgBlueBright: Ansi = InternalAnsi.bgBlueBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgMagentaBright: Ansi = InternalAnsi.bgMagentaBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgCyanBright: Ansi = InternalAnsi.bgCyanBright

/**
 * @since 1.0.0
 * @category colors
 */
export const bgWhiteBright: Ansi = InternalAnsi.bgWhiteBright

// -----------------------------------------------------------------------------
// Command Constructors
// -----------------------------------------------------------------------------

/**
 * Play a beeping sound.
 *
 * @since 1.0.0
 * @category commands
 */
export const beep: Ansi = InternalAnsi.beep

/**
 * Moves the cursor to the specified `row` and `column`.
 *
 * Though the ANSI Control Sequence for Cursor Position is `1`-based, this
 * method takes row and column values starting from `0` and adjusts them to `1`-
 * based values.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorTo: (column: number, row?: number) => Ansi = InternalAnsi.cursorTo

/**
 * Move the cursor position the specified number of `rows` and `columns`
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen in either direction, then
 * additional movement will have no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorMove: (column: number, row?: number) => Ansi = InternalAnsi.cursorMove

/**
 * Moves the cursor up by the specified number of `lines` (default `1`) relative
 * to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorUp: (lines?: number) => Ansi = InternalAnsi.cursorUp

/**
 * Moves the cursor down by the specified number of `lines` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorDown: (lines?: number) => Ansi = InternalAnsi.cursorDown

/**
 * Moves the cursor forward by the specified number of `columns` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorForward: (columns?: number) => Ansi = InternalAnsi.cursorForward

/**
 * Moves the cursor backward by the specified number of `columns` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorBackward: (columns?: number) => Ansi = InternalAnsi.cursorBackward

/**
 * Moves the cursor to the first column of the current row.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorLeft: Ansi = InternalAnsi.cursorLeft

/**
 * Saves the cursor position, encoding shift state and formatting attributes.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorSavePosition: Ansi = InternalAnsi.cursorSavePosition

/**
 * Restores the cursor position, encoding shift state and formatting attributes
 * from the previous save, if any, otherwise resets these all to their defaults.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorRestorePosition: Ansi = InternalAnsi.cursorRestorePosition

/**
 * Moves cursor to beginning of the line the specified number of rows down
 * (default `1`).
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorNextLine: (rows?: number) => Ansi = InternalAnsi.cursorNextLine

/**
 * Moves cursor to beginning of the line the specified number of rows up
 * (default `1`).
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorPrevLine: (rows?: number) => Ansi = InternalAnsi.cursorPrevLine

/**
 * Hides the cursor.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorHide: Ansi = InternalAnsi.cursorHide

/**
 * Shows the cursor.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorShow: Ansi = InternalAnsi.cursorShow

/**
 * Erase from the current cursor position up the specified amount of rows.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseLines: (rows: number) => Ansi = InternalAnsi.eraseLines

/**
 * Clears from the current cursor position to the end of the current line.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseEndLine: Ansi = InternalAnsi.eraseEndLine

/**
 * Clears from the current cursor position to the start of the current line.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseStartLine: Ansi = InternalAnsi.eraseStartLine

/**
 * Clears the current line.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseLine: Ansi = InternalAnsi.eraseLine

/**
 * Clears from the current cursor position to the end of the screen.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseDown: Ansi = InternalAnsi.eraseDown

/**
 * Clears from the current cursor position to the beginning of the screen.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseUp: Ansi = InternalAnsi.eraseUp

/**
 * Clears the entire screen and move the cursor to the upper left.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseScreen: Ansi = InternalAnsi.eraseScreen

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const stringify: (self: Ansi) => string = InternalAnsi.stringify

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @categrory combinators
 */
export const combine: {
  (that: Ansi): (self: Ansi) => Ansi
  (self: Ansi, that: Ansi): Ansi
} = InternalAnsi.combine
