// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumEffect_<R, R1, E, E1, A, A1, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, Tp.Tuple<[S, A1]>>
): C.Stream<R & R1, E | E1, A1> {
  const accumulator = (
    s: S
  ): CH.Channel<R1, E, CK.Chunk<A>, unknown, E | E1, CK.Chunk<A1>, void> =>
    CH.readWith(
      (in_) =>
        CH.unwrap(
          T.suspend(() => {
            const outputChunk = CK.builder<A1>()
            const emit: (a1: A1) => T.UIO<void> = (a) =>
              T.asUnit(
                T.succeedWith(() => {
                  outputChunk.append(a)
                })
              )

            return pipe(
              in_,
              T.reduce(s, (s1, a) =>
                T.chain_(f(s1, a), (sa) => T.as_(emit(Tp.get_(sa, 1)), Tp.get_(sa, 0)))
              ),
              T.fold(
                (failure) => {
                  const partialResult = outputChunk.build()

                  if (!CK.isEmpty(partialResult)) {
                    return CH.zipRight_(CH.write(partialResult), CH.fail(failure))
                  } else {
                    return CH.fail(failure)
                  }
                },
                (_) => CH.zipRight_(CH.write(outputChunk.build()), accumulator(_))
              )
            )
          })
        ),
      (_) => CH.fail(_),
      (_) => CH.unit
    )

  return new C.Stream(self.channel[">>>"](accumulator(s)))
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @ets_data_first mapAccumEffect_
 */
export function mapAccumEffect<R1, E1, A, A1, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, Tp.Tuple<[S, A1]>>
) {
  return <R, E>(self: C.Stream<R, E, A>) => mapAccumEffect_(self, s, f)
}
