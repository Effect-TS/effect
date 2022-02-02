// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as AB from "../../../../Support/AtomicBoolean/index.js"
import * as AR from "../../../../Support/AtomicReference/index.js"
import * as CH from "../../Channel/index.js"
import type * as SK from "../../Sink/index.js"
import * as C from "../core.js"

/**
 * Applies the transducer to the stream and emits its outputs.
 */
export function transduce_<R, R1, E, E1, A, Z>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E, A, E1, A, Z>
): C.Stream<R & R1, E1, Z> {
  return new C.Stream(
    CH.suspend(() => {
      const leftovers = new AR.AtomicReference(CK.empty<CK.Chunk<A>>())
      const upstreamDone = new AB.AtomicBoolean(false)
      const buffer: CH.Channel<
        unknown,
        E,
        CK.Chunk<A>,
        unknown,
        E,
        CK.Chunk<A>,
        any
      > = CH.suspend(() => {
        const l = leftovers.get

        if (CK.isEmpty(l)) {
          return CH.readWith(
            (c) => CH.zipRight_(CH.write(c), buffer),
            (e) => CH.fail(e),
            (done) => CH.end(done)
          )
        } else {
          leftovers.set(CK.empty())

          return CH.zipRight_(CH.writeChunk(l), buffer)
        }
      })

      const concatAndGet = (c: CK.Chunk<CK.Chunk<A>>): CK.Chunk<CK.Chunk<A>> => {
        const ls = leftovers.get
        const concat = CK.concat_(
          ls,
          CK.filter_(c, (a) => !CK.isEmpty(a))
        )

        leftovers.set(concat)

        return concat
      }
      const upstreamMarker: CH.Channel<
        unknown,
        E,
        CK.Chunk<A>,
        unknown,
        E,
        CK.Chunk<A>,
        any
      > = CH.readWith(
        (_in) => CH.zipRight_(CH.write(_in), upstreamMarker),
        (err) => CH.fail(err),
        (done) =>
          CH.zipRight_(
            CH.succeedWith(() => upstreamDone.set(true)),
            CH.end(done)
          )
      )

      const transducer: CH.Channel<
        R1,
        E,
        CK.Chunk<A>,
        unknown,
        E1,
        CK.Chunk<Z>,
        void
      > = CH.chain_(CH.doneCollect(sink.channel), ({ tuple: [leftover, z] }) =>
        CH.chain_(
          CH.succeedWith(() => Tp.tuple(upstreamDone.get, concatAndGet(leftover))),
          ({ tuple: [done, newLeftovers] }) => {
            const nextChannel =
              done && CK.isEmpty(newLeftovers) ? CH.end(undefined) : transducer

            return CH.zipRight_(CH.write(CK.single(z)), nextChannel)
          }
        )
      )

      return self.channel[">>>"](upstreamMarker)[">>>"](buffer)[">>>"](transducer)
    })
  )
}

/**
 * Applies the transducer to the stream and emits its outputs.
 *
 * @ets_data_first transduce_
 */
export function transduce<R, R1, E, E1, A, Z>(sink: SK.Sink<R1, E, A, E1, A, Z>) {
  return (self: C.Stream<R, E, A>) => transduce_(self, sink)
}
