import type { Tree } from "./Tree"

/**
 * @since 2.0.0
 */
export const URI = "Tree"

/**
 * @since 2.0.0
 */
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly Tree: Tree<A>
  }
}
