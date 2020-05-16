import { empty } from "../Array/empty"
import type { Show } from "../Show"

import type { Tree } from "./Tree"

/**
 * @since 2.0.0
 */
export function getShow<A>(S: Show<A>): Show<Tree<A>> {
  const show = (t: Tree<A>): string => {
    return t.forest === empty || t.forest.length === 0
      ? `make(${S.show(t.value)})`
      : `make(${S.show(t.value)}, [${t.forest.map(show).join(", ")}])`
  }
  return {
    show
  }
}
