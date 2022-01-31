// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Performs a filter and map in a single step.
 */
export function splitOnChunk_<R, E, A>(
  self: C.Stream<R, E, A>,
  delimiter: CK.Chunk<A>
): C.Stream<R, E, CK.Chunk<A>> {
  const next = (
    leftover: O.Option<CK.Chunk<A>>,
    delimiterIndex: number
  ): CH.Channel<R, E, CK.Chunk<A>, unknown, E, CK.Chunk<CK.Chunk<A>>, any> =>
    CH.readWithCause(
      (inputChunk) => {
        const buffer = CK.builder<CK.Chunk<A>>()

        const {
          tuple: [carry, delimiterCursor]
        } = CK.reduce_(
          inputChunk,
          Tp.tuple(
            O.getOrElse_(leftover, () => CK.empty<A>()),
            delimiterIndex
          ),
          ({ tuple: [carry, delimiterCursor] }, a) => {
            const concatenated = CK.append_(carry, a)

            if (
              delimiterCursor < CK.size(delimiter) &&
              a === CK.unsafeGet_(delimiter, delimiterCursor)
            ) {
              if (delimiterCursor + 1 === CK.size(delimiter)) {
                buffer.append(
                  CK.take_(concatenated, CK.size(concatenated) - CK.size(delimiter))
                )

                return Tp.tuple(CK.empty<A>(), 0)
              } else {
                return Tp.tuple(concatenated, delimiterCursor + 1)
              }
            } else {
              return Tp.tuple(concatenated, a === CK.unsafeGet_(delimiter, 0) ? 1 : 0)
            }
          }
        )

        return CH.zipRight_(
          CH.write(buffer.build()),
          next(!CK.isEmpty(carry) ? O.some(carry) : O.none, delimiterCursor)
        )
      },
      (halt) =>
        O.fold_(
          leftover,
          () => CH.failCause(halt),
          (chunk) => CH.zipRight_(CH.write(CK.single(chunk)), CH.failCause(halt))
        ),
      (done) =>
        O.fold_(
          leftover,
          () => CH.succeed(done),
          (chunk) => CH.zipRight_(CH.write(CK.single(chunk)), CH.succeed(done))
        )
    )

  return new C.Stream(self.channel[">>>"](next(O.none, 0)))
}

/**
 * Performs a filter and map in a single step.
 *
 * @ets_data_first splitOnChunk_
 */
export function splitOnChunk<A>(delimiter: CK.Chunk<A>) {
  return <R, E>(self: C.Stream<R, E, A>) => splitOnChunk_(self, delimiter)
}
