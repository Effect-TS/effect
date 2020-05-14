import type { Show } from "../Show"

import type { Const } from "./Const"

/**
 * @since 2.0.0
 */
export function getShow<E, A>(S: Show<E>): Show<Const<E, A>> {
  return {
    show: (c) => `make(${S.show(c)})`
  }
}
