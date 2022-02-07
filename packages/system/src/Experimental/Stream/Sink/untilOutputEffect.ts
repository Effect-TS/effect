// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import * as Ref from "../../../Ref/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 */
export function untilOutputEffect_<R, R1, InErr, In, OutErr, OutErr1, L extends In, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => T.Effect<R1, OutErr1, boolean>
): C.Sink<R & R1, InErr, In, OutErr | OutErr1, L, O.Option<Z>> {
  return new C.Sink(
    CH.chain_(
      CH.fromEffect(T.zip_(Ref.makeRef<CK.Chunk<In>>(CK.empty()), Ref.makeRef(false))),
      ({ tuple: [leftoversRef, upstreamDoneRef] }) => {
        const upstreamMarker: CH.Channel<
          unknown,
          InErr,
          CK.Chunk<In>,
          unknown,
          InErr,
          CK.Chunk<In>,
          any
        > = CH.readWith(
          (in_) => CH.zipRight_(CH.write(in_), upstreamMarker),
          (_) => CH.fail(_),
          (_) => CH.as_(CH.fromEffect(upstreamDoneRef.set(true)), _)
        )

        const loop: CH.Channel<
          R & R1,
          InErr,
          CK.Chunk<In>,
          unknown,
          OutErr | OutErr1,
          CK.Chunk<L>,
          O.Option<Z>
        > = CH.foldChannel_(
          CH.doneCollect(self.channel),
          CH.fail,
          ({ tuple: [leftovers, doneValue] }) =>
            pipe(
              CH.do,
              CH.bind("satisfied", () => CH.fromEffect(f(doneValue))),
              CH.bind("_", () =>
                CH.fromEffect(leftoversRef.set(CK.flatten(leftovers)))
              ),
              CH.bind("upstreamDone", () => CH.fromEffect(upstreamDoneRef.get)),
              CH.bind("res", ({ satisfied, upstreamDone }) => {
                if (satisfied) {
                  return CH.as_(CH.write(CK.flatten(leftovers)), O.some(doneValue))
                } else if (upstreamDone) {
                  return CH.as_(CH.write(CK.flatten(leftovers)), O.none)
                } else {
                  return loop
                }
              }),
              CH.map(({ res }) => res)
            )
        )

        return upstreamMarker[">>>"](CH.bufferChunk(leftoversRef))[">>>"](loop)
      }
    )
  )
}

/**
 * Creates a sink that produces values until one verifies
 * the predicate `f`.
 *
 * @ets_data_first untilOutputEffect_
 */
export function untilOutputEffect<R1, OutErr1, Z>(
  f: (z: Z) => T.Effect<R1, OutErr1, boolean>
) {
  return <R, InErr, In, OutErr, L extends In>(
    self: C.Sink<R, InErr, In, OutErr, L, Z>
  ) => untilOutputEffect_(self, f)
}
