import { empty } from "../Array/empty"

import type { Forest, Tree } from "./Tree"

/**
 * @since 2.0.0
 */
export function make<A>(value: A, forest: Forest<A> = empty): Tree<A> {
  return {
    value,
    forest
  }
}
