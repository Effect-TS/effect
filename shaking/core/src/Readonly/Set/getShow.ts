import type { Show } from "../../Show"
/**
 * @since 2.5.0
 */

export function getShow<A>(S: Show<A>): Show<ReadonlySet<A>> {
  return {
    show: (s) => {
      let elements = ""
      s.forEach((a) => {
        elements += S.show(a) + ", "
      })
      if (elements !== "") {
        elements = elements.substring(0, elements.length - 2)
      }
      return `new Set([${elements}])`
    }
  }
}
