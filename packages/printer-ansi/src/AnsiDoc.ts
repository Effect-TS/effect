/**
 * @since 1.0.0
 */
import type { Doc } from "@effect/printer/Doc"
import type { AvailablePerLine } from "@effect/printer/PageWidth"
import type { Ansi } from "./Ansi.js"
import * as InternalAnsiDoc from "./internal/ansiDoc.js"
import * as InternalAnsiRender from "./internal/ansiRender.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type AnsiDoc = Doc<Ansi>

/**
 * @since 1.0.0
 */
export declare namespace AnsiDoc {
  /**
   * @since 1.0.0
   * @category model
   */
  export type RenderConfig = Compact | Pretty | Smart

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Compact {
    readonly style: "compact"
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Pretty {
    readonly style: "pretty"
    readonly options?: Partial<Omit<AvailablePerLine, "_tag">>
  }

  /**
   * @since 1.0.0
   * @category model
   */
  export interface Smart {
    readonly style: "smart"
    readonly options?: Partial<Omit<AvailablePerLine, "_tag">>
  }
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * Play a beeping sound.
 *
 * @since 1.0.0
 * @category constructors
 */
export const beep: AnsiDoc = InternalAnsiDoc.beep

/**
 * Moves the cursor to the specified `row` and `column`.
 *
 * Though the ANSI Control Sequence for Cursor Position is `1`-based, this
 * method takes row and column values starting from `0` and adjusts them to `1`-
 * based values.
 *
 * @since 1.0.0
 * @category constructors
 */
export const cursorTo: (column: number, row?: number) => AnsiDoc = InternalAnsiDoc.cursorTo

/**
 * Move the cursor position the specified number of `rows` and `columns`
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen in either direction, then
 * additional movement will have no effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const cursorMove: (column: number, row?: number) => AnsiDoc = InternalAnsiDoc.cursorMove

/**
 * Moves the cursor up by the specified number of `lines` (default `1`) relative
 * to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorUp: (lines?: number) => AnsiDoc = InternalAnsiDoc.cursorUp

/**
 * Moves the cursor down by the specified number of `lines` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorDown: (lines?: number) => AnsiDoc = InternalAnsiDoc.cursorDown

/**
 * Moves the cursor forward by the specified number of `columns` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorForward: (columns?: number) => AnsiDoc = InternalAnsiDoc.cursorForward

/**
 * Moves the cursor backward by the specified number of `columns` (default `1`)
 * relative to the current cursor position.
 *
 * If the cursor is already at the edge of the screen, this has no effect.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorBackward: (columns?: number) => AnsiDoc = InternalAnsiDoc.cursorBackward

/**
 * Moves the cursor to the first column of the current row.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorLeft: AnsiDoc = InternalAnsiDoc.cursorLeft

/**
 * Saves the cursor position, encoding shift state and formatting attributes.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorSavePosition: AnsiDoc = InternalAnsiDoc.cursorSavePosition

/**
 * Restores the cursor position, encoding shift state and formatting attributes
 * from the previous save, if any, otherwise resets these all to their defaults.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorRestorePosition: AnsiDoc = InternalAnsiDoc.cursorRestorePosition

/**
 * Moves cursor to beginning of the line the specified number of rows down
 * (default `1`).
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorNextLine: (rows?: number) => AnsiDoc = InternalAnsiDoc.cursorNextLine

/**
 * Moves cursor to beginning of the line the specified number of rows up
 * (default `1`).
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorPrevLine: (rows?: number) => AnsiDoc = InternalAnsiDoc.cursorPrevLine

/**
 * Hides the cursor.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorHide: AnsiDoc = InternalAnsiDoc.cursorHide

/**
 * Shows the cursor.
 *
 * @since 1.0.0
 * @category commands
 */
export const cursorShow: AnsiDoc = InternalAnsiDoc.cursorShow

/**
 * Erase from the current cursor position up the specified amount of rows.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseLines: (rows: number) => AnsiDoc = InternalAnsiDoc.eraseLines

/**
 * Clears from the current cursor position to the end of the current line.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseEndLine: AnsiDoc = InternalAnsiDoc.eraseEndLine

/**
 * Clears from the current cursor position to the start of the current line.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseStartLine: AnsiDoc = InternalAnsiDoc.eraseStartLine

/**
 * Clears the current line.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseLine: AnsiDoc = InternalAnsiDoc.eraseLine

/**
 * Clears from the current cursor position to the end of the screen.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseDown: AnsiDoc = InternalAnsiDoc.eraseDown

/**
 * Clears from the current cursor position to the beginning of the screen.
 *
 * The current cursor position does not change.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseUp: AnsiDoc = InternalAnsiDoc.eraseUp

/**
 * Clears the entire screen and move the cursor to the upper left.
 *
 * @since 1.0.0
 * @category commands
 */
export const eraseScreen: AnsiDoc = InternalAnsiDoc.eraseScreen

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const render: {
  (config: AnsiDoc.RenderConfig): (self: AnsiDoc) => string
  (self: AnsiDoc, config: AnsiDoc.RenderConfig): string
} = InternalAnsiRender.render

// -----------------------------------------------------------------------------
// Re-Exports
// -----------------------------------------------------------------------------

export type {
  /**
   * @since 1.0.0
   * @category model
   */
  Annotated,
  /**
   * @since 1.0.0
   * @category model
   */
  Cat,
  /**
   * @since 1.0.0
   * @category model
   */
  Char,
  /**
   * @since 1.0.0
   * @category model
   */
  Column,
  /**
   * @since 1.0.0
   * @category model
   */
  Covariant,
  /**
   * @since 1.0.0
   * @category model
   */
  Doc,
  /**
   * @since 1.0.0
   * @category model
   */
  DocTypeId,
  /**
   * @since 1.0.0
   * @category model
   */
  DocTypeLambda,
  /**
   * @since 1.0.0
   * @category model
   */
  Empty,
  /**
   * @since 1.0.0
   * @category model
   */
  Fail,
  /**
   * @since 1.0.0
   * @category model
   */
  FlatAlt,
  /**
   * @since 1.0.0
   * @category model
   */
  Line,
  /**
   * @since 1.0.0
   * @category model
   */
  Nest,
  /**
   * @since 1.0.0
   * @category model
   */
  Nesting,
  /**
   * @since 1.0.0
   * @category model
   */
  Text,
  /**
   * @since 1.0.0
   * @category model
   */
  Union,
  /**
   * @since 1.0.0
   * @category model
   */
  WithPageWidth
} from "@effect/printer/Doc"

export type {
  /**
   * @since 1.0.0
   * @category model
   */
  AlreadyFlat,
  /**
   * @since 1.0.0
   * @category model
   */
  Flatten,
  /**
   * @since 1.0.0
   * @category model
   */
  Flattened,
  /**
   * @since 1.0.0
   * @category model
   */
  NeverFlat
} from "@effect/printer/Flatten"

export {
  /**
   * @since 1.0.0
   * @category alignment
   */
  align,
  /**
   * @since 1.0.0
   * @category annotations
   */
  alterAnnotations,
  /**
   * @since 1.0.0
   * @category utilities
   */
  angleBracketed,
  /**
   * @since 1.0.0
   * @category annotations
   */
  annotate,
  /**
   * @since 1.0.0
   * @category primitives
   */
  backslash,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  cat,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  cats,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  catWithLine,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  catWithLineBreak,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  catWithSoftLine,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  catWithSoftLineBreak,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  catWithSpace,
  /**
   * @since 1.0.0
   * @category flattening
   */
  changesUponFlattening,
  /**
   * @since 1.0.0
   * @category constructors
   */
  char,
  /**
   * @since 1.0.0
   * @category primitives
   */
  colon,
  /**
   * @since 1.0.0
   * @category reactive layouts
   */
  column,
  /**
   * @since 1.0.0
   * @category primitives
   */
  comma,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  concatWith,
  /**
   * @since 1.0.0
   * @category utilities
   */
  curlyBraced,
  /**
   * @since 1.0.0
   * @category primitives
   */
  dot,
  /**
   * @since 1.0.0
   * @category utilities
   */
  doubleQuoted,
  /**
   * @since 1.0.0
   * @category primitives
   */
  dquote,
  /**
   * @since 1.0.0
   * @category primitives
   */
  empty,
  /**
   * @since 1.0.0
   * @category alignment
   */
  encloseSep,
  /**
   * @since 1.0.0
   * @category primitives
   */
  equalSign,
  /**
   * @since 1.0.0
   * @category primitives
   */
  fail,
  /**
   * @since 1.0.0
   * @category filling
   */
  fill,
  /**
   * @since 1.0.0
   * @category filling
   */
  fillBreak,
  /**
   * @since 1.0.0
   * @category filling
   */
  fillCat,
  /**
   * @since 1.0.0
   * @category filling
   */
  fillSep,
  /**
   * @since 1.0.0
   * @category alternative layouts
   */
  flatAlt,
  /**
   * @since 1.0.0
   * @category flattening
   */
  flatten,
  /**
   * @since 1.0.0
   * @category alternative layouts
   */
  group,
  /**
   * @since 1.0.0
   * @category alignment
   */
  hang,
  /**
   * @since 1.0.0
   * @category primitives
   */
  hardLine,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  hcat,
  /**
   * @since 1.0.0
   * @category separation
   */
  hsep,
  /**
   * @since 1.0.0
   * @category alignment
   */
  indent,
  /**
   * @since 1.0.0
   * @category instances
   */
  Invariant,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isAnnotated,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isCat,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isChar,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isColumn,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isDoc,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isEmpty,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isFail,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isFlatAlt,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isLine,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isNest,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isNesting,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isText,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isUnion,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isWithPageWidth,
  /**
   * @since 1.0.0
   * @category primitives
   */
  langle,
  /**
   * @since 1.0.0
   * @category primitives
   */
  lbrace,
  /**
   * @since 1.0.0
   * @category primitives
   */
  lbracket,
  /**
   * @since 1.0.0
   * @category primitives
   */
  line,
  /**
   * @since 1.0.0
   * @category primitives
   */
  lineBreak,
  /**
   * @since 1.0.0
   * @category alignment
   */
  list,
  /**
   * @since 1.0.0
   * @category primitives
   */
  lparen,
  /**
   * @since 1.0.0
   * @category combinators
   */
  map,
  /**
   * @since 1.0.0
   * @category matching
   */
  match,
  /**
   * @since 1.0.0
   * @category alignment
   */
  nest,
  /**
   * @since 1.0.0
   * @category reactive layouts
   */
  nesting,
  /**
   * @since 1.0.0
   * @category reactive layouts
   */
  pageWidth,
  /**
   * @since 1.0.0
   * @category utilities
   */
  parenthesized,
  /**
   * @since 1.0.0
   * @category utilities
   */
  punctuate,
  /**
   * @since 1.0.0
   * @category primitives
   */
  rangle,
  /**
   * @since 1.0.0
   * @category primitives
   */
  rbrace,
  /**
   * @since 1.0.0
   * @category primitives
   */
  rbracket,
  /**
   * @since 1.0.0
   * @category annotations
   */
  reAnnotate,
  /**
   * @since 1.0.0
   * @category utilities
   */
  reflow,
  /**
   * @since 1.0.0
   * @category primitives
   */
  rparen,
  /**
   * @since 1.0.0
   * @category primitives
   */
  semi,
  /**
   * @since 1.0.0
   * @category separation
   */
  seps,
  /**
   * @since 1.0.0
   * @category utilities
   */
  singleQuoted,
  /**
   * @since 1.0.0
   * @category primitives
   */
  slash,
  /**
   * @since 1.0.0
   * @category primitives
   */
  softLine,
  /**
   * @since 1.0.0
   * @category primitives
   */
  softLineBreak,
  /**
   * @since 1.0.0
   * @category primitives
   */
  space,
  /**
   * @since 1.0.0
   * @category utilities
   */
  spaces,
  /**
   * @since 1.0.0
   * @category utilities
   */
  squareBracketed,
  /**
   * @since 1.0.0
   * @category primitives
   */
  squote,
  /**
   * @since 1.0.0
   * @category constructors
   */
  string,
  /**
   * @since 1.0.0
   * @category utilities
   */
  surround,
  /**
   * @since 1.0.0
   * @category constructors
   */
  text,
  /**
   * @since 1.0.0
   * @category utilities
   */
  textSpaces,
  /**
   * @since 1.0.0
   * @category alignment
   */
  tupled,
  /**
   * @since 1.0.0
   * @category annotations
   */
  unAnnotate,
  /**
   * @since 1.0.0
   * @category alternative layouts
   */
  union,
  /**
   * @since 1.0.0
   * @category primitives
   */
  vbar,
  /**
   * @since 1.0.0
   * @category concatenation
   */
  vcat,
  /**
   * @since 1.0.0
   * @category separation
   */
  vsep,
  /**
   * @since 1.0.0
   * @category reactive layouts
   */
  width,
  /**
   * @since 1.0.0
   * @category utilities
   */
  words
} from "@effect/printer/Doc"
