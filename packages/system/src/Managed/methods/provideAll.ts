import { provideSome_ } from "../core"
import type { Managed } from "../managed"

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll<R>(r: R) {
  return <E, A>(self: Managed<R, E, A>) => provideAll_(self, r)
}

/**
 * Provides the `Managed` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(self: Managed<R, E, A>, r: R) {
  return provideSome_(self, () => r)
}
