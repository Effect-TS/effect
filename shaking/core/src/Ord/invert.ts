import { Ordering } from "./Ordering"

/**
 * @since 2.0.0
 */
export function invert(O: Ordering): Ordering {
  switch (O) {
    case -1:
      return 1
    case 1:
      return -1
    default:
      return 0
  }
}
