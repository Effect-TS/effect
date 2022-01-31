// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Intersperse stream with provided element.
 */
export function intersperse_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  middle: A1
): C.Stream<R, E, A | A1> {
  const writer = (
    isFirst: boolean
  ): CH.Channel<R, E, CK.Chunk<A | A1>, unknown, E, CK.Chunk<A | A1>, void> =>
    CH.readWith(
      (chunk: CK.Chunk<A | A1>) => {
        const builder = CK.builder<A | A1>()
        let flagResult = isFirst

        CK.forEach_(chunk, (o) => {
          if (flagResult) {
            flagResult = false
            builder.append(o)
          } else {
            builder.append(middle)
            builder.append(o)
          }
        })

        return CH.zipRight_(CH.write(builder.build()), writer(flagResult))
      },
      (err: E) => CH.fail(err),
      (_) => CH.unit
    )

  return new C.Stream(self.channel[">>>"](writer(true)))
}

/**
 * Intersperse stream with provided element.
 *
 * @ets_data_first intersperse_
 */
export function intersperse<A1>(middle: A1) {
  return <R, E, A>(self: C.Stream<R, E, A>) => intersperse_(self, middle)
}
