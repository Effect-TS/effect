// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export function toCode(color: Color): number {
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
