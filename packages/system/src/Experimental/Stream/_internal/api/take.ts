// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Die from "./die.js"
import * as Empty from "./empty.js"

function takeLoop<E, A>(
  n: number
): CH.Channel<unknown, E, CK.Chunk<A>, unknown, E, CK.Chunk<A>, unknown> {
  return CH.readWith(
    (i) => {
      const taken = CK.take_(i, n)
      const left = Math.max(n - CK.size(taken), 0)
      if (left > 0) {
        return CH.chain_(CH.write(taken), () => takeLoop(left))
      } else {
        return CH.write(taken)
      }
    },
    CH.fail,
    CH.end
  )
}

/**
 * Takes the specified number of elements from this stream.
 */
export function take_<R, E, A>(self: C.Stream<R, E, A>, n: number): C.Stream<R, E, A> {
  if (n <= 0) {
    return Empty.empty
  }
  if (!Number.isInteger(n)) {
    return Die.die(new CS.IllegalArgumentException(`${n} should be an integer`))
  }
  return new C.Stream(self.channel[">>>"](takeLoop(n)))
}

/**
 * Takes the specified number of elements from this stream.
 *
 * @ets_data_first take_
 */
export function take(
  n: number
): <R, E, A>(self: C.Stream<R, E, A>) => C.Stream<R, E, A> {
  return (self) => take_(self, n)
}
