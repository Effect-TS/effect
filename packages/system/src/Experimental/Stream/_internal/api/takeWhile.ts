// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type { Predicate } from "../../../../Function/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function takeWhile_<R, E, A>(
  self: C.Stream<R, E, A>,
  f: Predicate<A>
): C.Stream<R, E, A> {
  const loop: CH.Channel<R, E, CK.Chunk<A>, unknown, E, CK.Chunk<A>, any> = CH.readWith(
    (chunk) => {
      const taken = CK.takeWhile_(chunk, f)
      const more = CK.size(taken) === CK.size(chunk)

      if (more) {
        return CH.zipRight_(CH.write(taken), loop)
      } else {
        return CH.write(taken)
      }
    },
    (_) => CH.fail(_),
    (_) => CH.succeed(_)
  )

  return new C.Stream(self.channel[">>>"](loop))
}

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 *
 * @ets_data_first takeWhile_
 */
export function takeWhile<A>(f: Predicate<A>) {
  return <R, E>(self: C.Stream<R, E, A>) => takeWhile_(self, f)
}
