// ets_tracing: off

import { constant } from "@effect-ts/core/Function"
import { matchTag } from "@effect-ts/core/Utils"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

export class Black {
  readonly _tag = "Black"
}

export class Red {
  readonly _tag = "Red"
}

export class Green {
  readonly _tag = "Green"
}

export class Yellow {
  readonly _tag = "Yellow"
}

export class Blue {
  readonly _tag = "Blue"
}

export class Magenta {
  readonly _tag = "Magenta"
}

export class Cyan {
  readonly _tag = "Cyan"
}

export class White {
  readonly _tag = "White"
}

export type Color = Black | Red | Green | Yellow | Blue | Magenta | Cyan | White

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const black: Color = new Black()

export const red: Color = new Red()

export const green: Color = new Green()

export const yellow: Color = new Yellow()

export const blue: Color = new Blue()

export const magenta: Color = new Magenta()

export const cyan: Color = new Cyan()

export const white: Color = new White()

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function colorToCode(color: Color): number {
  return color["|>"](
    matchTag({
      Black: constant(0),
      Red: constant(1),
      Green: constant(2),
      Yellow: constant(3),
      Blue: constant(4),
      Magenta: constant(5),
      Cyan: constant(6),
      White: constant(7)
    })
  )
}
