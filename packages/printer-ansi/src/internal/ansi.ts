import * as Monoid from "@effect/typeclass/Monoid"
import * as Semigroup from "@effect/typeclass/Semigroup"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Ansi from "../Ansi.js"
import type * as Color from "../Color.js"
import * as InternalColor from "./color.js"
import * as SGR from "./sgr.js"
import * as Style from "./style.js"

const AnsiSymbolKey = "@effect/printer-ansi/Ansi"

/** @internal */
export const AnsiTypeId: Ansi.AnsiTypeId = Symbol.for(AnsiSymbolKey) as Ansi.AnsiTypeId

interface AnsiParams {
  readonly char: ReadonlyArray<string>
  readonly commands: ReadonlyArray<string>
  readonly styles: ReadonlyArray<Style.Style>
  readonly foreground: Option.Option<SGR.SGR>
  readonly background: Option.Option<SGR.SGR>
  readonly bold: Option.Option<SGR.SGR>
  readonly strikethrough: Option.Option<SGR.SGR>
  readonly italicized: Option.Option<SGR.SGR>
  readonly underlined: Option.Option<SGR.SGR>
}

interface AnsiImpl extends Ansi.Ansi, AnsiParams {}

const make = (params: Partial<AnsiParams>): Ansi.Ansi => ({ ...AnsiMonoid.empty, ...params })

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

const typeIdSemigroup = Semigroup.first<Ansi.AnsiTypeId>()

const getFirstSomeSemigroup: Semigroup.Semigroup<Option.Option<SGR.SGR>> = Semigroup.make(
  (self, that) => Option.isSome(self) ? self : that
)

const AnsiSemigroup: Semigroup.Semigroup<AnsiImpl> = Semigroup.struct({
  [AnsiTypeId]: typeIdSemigroup,
  char: Semigroup.array<string>(),
  commands: Semigroup.array<string>(),
  styles: Semigroup.array<Style.Style>(),
  foreground: getFirstSomeSemigroup,
  background: getFirstSomeSemigroup,
  bold: getFirstSomeSemigroup,
  italicized: getFirstSomeSemigroup,
  strikethrough: getFirstSomeSemigroup,
  underlined: getFirstSomeSemigroup
})

const typeIdMonoid = Monoid.fromSemigroup(typeIdSemigroup, AnsiTypeId)

const monoidOrElse = Monoid.fromSemigroup(getFirstSomeSemigroup, Option.none())

const AnsiMonoid: Monoid.Monoid<AnsiImpl> = Monoid.struct({
  [AnsiTypeId]: typeIdMonoid,
  char: Monoid.array<string>(),
  commands: Monoid.array<string>(),
  styles: Monoid.array<Style.Style>(),
  foreground: monoidOrElse,
  background: monoidOrElse,
  bold: monoidOrElse,
  italicized: monoidOrElse,
  strikethrough: monoidOrElse,
  underlined: monoidOrElse
})

/** @internal */
export const none: Ansi.Ansi = AnsiMonoid.empty

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

/** @internal */
export const bold: Ansi.Ansi = make({ bold: Option.some(SGR.setBold(true)) })

/** @internal */
export const italicized: Ansi.Ansi = make({ italicized: Option.some(SGR.setItalicized(true)) })

/** @internal */
export const strikethrough: Ansi.Ansi = make({ strikethrough: Option.some(SGR.setStrikethrough(true)) })

/** @internal */
export const underlined: Ansi.Ansi = make({ underlined: Option.some(SGR.setUnderlined(true)) })

/** @internal */
export const faint: Ansi.Ansi = make({ styles: [Style.faint(true)] })

/** @internal */
export const invert: Ansi.Ansi = make({ styles: [Style.invert(true)] })

/** @internal */
export const fg = (color: Style.Style.Color): Ansi.Ansi => make({ styles: [Style.fg(color)] })

/** @internal */
export const bg = (color: Style.Style.Color): Ansi.Ansi => make({ styles: [Style.bg(color)] })

// -----------------------------------------------------------------------------
// Colors
// -----------------------------------------------------------------------------

/** @internal */
export const brightColor = (color: Color.Color): Ansi.Ansi =>
  make({ foreground: Option.some(SGR.setColor(color, true, "foreground")) })

/** @internal */
export const color = (color: Color.Color): Ansi.Ansi =>
  make({ foreground: Option.some(SGR.setColor(color, false, "foreground")) })

/** @internal */
export const bgColorBright = (color: Color.Color): Ansi.Ansi =>
  make({ background: Option.some(SGR.setColor(color, true, "background")) })

/** @internal */
export const bgColor = (color: Color.Color): Ansi.Ansi =>
  make({ background: Option.some(SGR.setColor(color, false, "background")) })

/** @internal */
export const black: Ansi.Ansi = color(InternalColor.black)

/** @internal */
export const red: Ansi.Ansi = color(InternalColor.red)

/** @internal */
export const green: Ansi.Ansi = color(InternalColor.green)

/** @internal */
export const yellow: Ansi.Ansi = color(InternalColor.yellow)

/** @internal */
export const blue: Ansi.Ansi = color(InternalColor.blue)

/** @internal */
export const magenta: Ansi.Ansi = color(InternalColor.magenta)

/** @internal */
export const cyan: Ansi.Ansi = color(InternalColor.cyan)

/** @internal */
export const white: Ansi.Ansi = color(InternalColor.white)

/** @internal */
export const blackBright: Ansi.Ansi = brightColor(InternalColor.black)

/** @internal */
export const redBright: Ansi.Ansi = brightColor(InternalColor.red)

/** @internal */
export const greenBright: Ansi.Ansi = brightColor(InternalColor.green)

/** @internal */
export const yellowBright: Ansi.Ansi = brightColor(InternalColor.yellow)

/** @internal */
export const blueBright: Ansi.Ansi = brightColor(InternalColor.blue)

/** @internal */
export const magentaBright: Ansi.Ansi = brightColor(InternalColor.magenta)

/** @internal */
export const cyanBright: Ansi.Ansi = brightColor(InternalColor.cyan)

/** @internal */
export const whiteBright: Ansi.Ansi = brightColor(InternalColor.white)

/** @internal */
export const bgBlack: Ansi.Ansi = bgColor(InternalColor.black)

/** @internal */
export const bgRed: Ansi.Ansi = bgColor(InternalColor.red)

/** @internal */
export const bgGreen: Ansi.Ansi = bgColor(InternalColor.green)

/** @internal */
export const bgYellow: Ansi.Ansi = bgColor(InternalColor.yellow)

/** @internal */
export const bgBlue: Ansi.Ansi = bgColor(InternalColor.blue)

/** @internal */
export const bgMagenta: Ansi.Ansi = bgColor(InternalColor.magenta)

/** @internal */
export const bgCyan: Ansi.Ansi = bgColor(InternalColor.cyan)

/** @internal */
export const bgWhite: Ansi.Ansi = bgColor(InternalColor.white)

/** @internal */
export const bgBlackBright: Ansi.Ansi = bgColorBright(InternalColor.black)

/** @internal */
export const bgRedBright: Ansi.Ansi = bgColorBright(InternalColor.red)

/** @internal */
export const bgGreenBright: Ansi.Ansi = bgColorBright(InternalColor.green)

/** @internal */
export const bgYellowBright: Ansi.Ansi = bgColorBright(InternalColor.yellow)

/** @internal */
export const bgBlueBright: Ansi.Ansi = bgColorBright(InternalColor.blue)

/** @internal */
export const bgMagentaBright: Ansi.Ansi = bgColorBright(InternalColor.magenta)

/** @internal */
export const bgCyanBright: Ansi.Ansi = bgColorBright(InternalColor.cyan)

/** @internal */
export const bgWhiteBright: Ansi.Ansi = bgColorBright(InternalColor.white)

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

/** @internal */
export const beep: Ansi.Ansi = make({ char: ReadonlyArray.of("\u0007") })

const SEP = ";"
/** @internal */
export const cursorTo = (column: number, row?: number): Ansi.Ansi => {
  if (row === undefined) {
    const command = `${Math.max(column + 1, 0)}G`
    return make({ commands: ReadonlyArray.of(command) })
  }
  const command = `${row + 1}${SEP}${Math.max(column + 1, 0)}H`
  return make({ commands: ReadonlyArray.of(command) })
}

/** @internal */
export const cursorMove = (column: number, row: number = 0): Ansi.Ansi => {
  const commands = Array<string>()
  if (row < 0) {
    commands.push(`${-row}A`)
  }
  if (row > 0) {
    commands.push(`${row}B`)
  }
  if (column > 0) {
    commands.push(`${column}C`)
  }
  if (column < 0) {
    commands.push(`${-column}D`)
  }
  return make({ commands })
}

/** @internal */
export const cursorUp = (rows: number = 1): Ansi.Ansi => make({ commands: ReadonlyArray.of(`${rows}A`) })

/** @internal */
export const cursorDown = (rows: number = 1): Ansi.Ansi => make({ commands: ReadonlyArray.of(`${rows}B`) })

/** @internal */
export const cursorForward = (columns: number = 1): Ansi.Ansi => make({ commands: ReadonlyArray.of(`${columns}C`) })

/** @internal */
export const cursorBackward = (columns: number = 1): Ansi.Ansi => make({ commands: ReadonlyArray.of(`${columns}D`) })

/** @internal */
export const cursorLeft: Ansi.Ansi = make({ commands: ReadonlyArray.of("G") })

/** @internal */
export const cursorSavePosition: Ansi.Ansi = make({ commands: ReadonlyArray.of("s") })

/** @internal */
export const cursorRestorePosition: Ansi.Ansi = make({ commands: ReadonlyArray.of("u") })

/** @internal */
export const cursorNextLine = (rows: number = 1): Ansi.Ansi => make({ commands: ReadonlyArray.of(`${rows}E`) })

/** @internal */
export const cursorPrevLine = (rows: number = 1): Ansi.Ansi => make({ commands: ReadonlyArray.of(`${rows}F`) })

/** @internal */
export const cursorHide: Ansi.Ansi = make({ commands: ReadonlyArray.of("?25l") })

/** @internal */
export const cursorShow: Ansi.Ansi = make({ commands: ReadonlyArray.of("?25h") })

/** @internal */
export const eraseLines = (rows: number): Ansi.Ansi => {
  const commands = Array<string>()
  for (let i = 0; i < rows; i++) {
    commands.push("2K")
    if (i < rows - 1) commands.push("1A")
  }
  if (rows > 0) {
    commands.push("G")
  }
  return make({ commands })
}

/** @internal */
export const eraseEndLine: Ansi.Ansi = make({ commands: ReadonlyArray.of("K") })

/** @internal */
export const eraseStartLine: Ansi.Ansi = make({ commands: ReadonlyArray.of("1K") })

/** @internal */
export const eraseLine: Ansi.Ansi = make({ commands: ReadonlyArray.of("2K") })

/** @internal */
export const eraseDown: Ansi.Ansi = make({ commands: ReadonlyArray.of("J") })

/** @internal */
export const eraseUp: Ansi.Ansi = make({ commands: ReadonlyArray.of("1J") })

/** @internal */
export const eraseScreen: Ansi.Ansi = make({ commands: ReadonlyArray.of("2J") })

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const stringify = (self: Ansi.Ansi): string => stringifyInternal(self as AnsiImpl)

// -----------------------------------------------------------------------------
// Combinators
// -----------------------------------------------------------------------------

/** @internal */
export const combine = dual<
  (that: Ansi.Ansi) => (self: Ansi.Ansi) => Ansi.Ansi,
  (self: Ansi.Ansi, that: Ansi.Ansi) => Ansi.Ansi
>(2, (self, that) => combineInternal(self as AnsiImpl, that as AnsiImpl))

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

const combineInternal = (self: AnsiImpl, that: AnsiImpl): Ansi.Ansi => AnsiSemigroup.combine(self, that)

/*
├── Bell
└── Escape
    ├── OSC (System Comm)
    └── CSI (Control Seq)
        └── SGR (Styles)
            └── Colors
*/
const stringifyInternal = (self: AnsiImpl): string => {
  const sgr = SGR.toCode(
    ReadonlyArray.getSomes([
      Option.some(SGR.reset),
      self.foreground,
      self.background,
      self.bold,
      self.italicized,
      self.strikethrough,
      self.underlined
    ])
  )
  // FIXME: When both styles and sgr reconcile this won't be necessary
  const styles = self.styles.length > 0 ? Style.toCode(self.styles) : sgr
  const sequences = pipe(self.commands, ReadonlyArray.prepend(styles), ReadonlyArray.map((c) => `\u001B[${c}`))
  const commands = pipe(sequences, ReadonlyArray.append(self.char))
  return `${commands.join("")}`
}
