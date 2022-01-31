// ets_tracing: off

import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(self: C.Stream<R, E, A>, r: R): C.IO<E, A> {
  return new C.Stream(CH.provideAll_(self.channel, r))
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @ets_data_first provideAll_
 */
export function provideAll<R>(r: R) {
  return <E, A>(self: C.Stream<R, E, A>) => provideAll_(self, r)
}
