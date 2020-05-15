import type { Show } from "../../Show"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { collect } from "./collect"

/**
 * @since 2.5.0
 */

export function getShow<A>(S: Show<A>): Show<ReadonlyRecord<string, A>> {
  return {
    show: (r) => {
      const elements = collect((k, a: A) => `${JSON.stringify(k)}: ${S.show(a)}`)(
        r
      ).join(", ")
      return elements === "" ? "{}" : `{ ${elements} }`
    }
  }
}
