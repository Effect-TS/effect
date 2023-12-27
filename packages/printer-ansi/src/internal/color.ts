import type * as Color from "../Color.js"

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const black: Color.Color = {
  _tag: "Black"
}

/** @internal */
export const red: Color.Color = {
  _tag: "Red"
}

/** @internal */
export const green: Color.Color = {
  _tag: "Green"
}

/** @internal */
export const yellow: Color.Color = {
  _tag: "Yellow"
}

/** @internal */
export const blue: Color.Color = {
  _tag: "Blue"
}

/** @internal */
export const magenta: Color.Color = {
  _tag: "Magenta"
}

/** @internal */
export const cyan: Color.Color = {
  _tag: "Cyan"
}

/** @internal */
export const white: Color.Color = {
  _tag: "White"
}

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const toCode = (color: Color.Color): number => {
  switch (color._tag) {
    case "Black": {
      return 0
    }
    case "Red": {
      return 1
    }
    case "Green": {
      return 2
    }
    case "Yellow": {
      return 3
    }
    case "Blue": {
      return 4
    }
    case "Magenta": {
      return 5
    }
    case "Cyan": {
      return 6
    }
    case "White": {
      return 7
    }
  }
}
