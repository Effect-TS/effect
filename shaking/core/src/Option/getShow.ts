import type { Option } from "fp-ts/lib/Option"
import type { Show } from "fp-ts/lib/Show"

import { isNone } from "./isNone"

/**
 * @since 2.0.0
 */
export function getShow<A>(S: Show<A>): Show<Option<A>> {
  return {
    show: (ma) => (isNone(ma) ? "none" : `some(${S.show(ma.value)})`)
  }
}
