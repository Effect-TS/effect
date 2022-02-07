// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import type { Predicate } from "../../../Function/index.js"
import { pipe } from "../../../Function/index.js"
import * as Ref from "../../../Ref/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith_<R, InErr, In, OutErr, L extends In, Z, S>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  z: S,
  p: Predicate<Z>,
  f: (s: S, z: Z) => S
): C.Sink<R, InErr, In, OutErr, L, S> {
  return new C.Sink(
    pipe(
      CH.fromEffect(T.zip_(Ref.makeRef(CK.empty<In>()), Ref.makeRef(false))),
      CH.chain(({ tuple: [leftoversRef, upstreamDoneRef] }) => {
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
          (x) => CH.as_(CH.fromEffect(upstreamDoneRef.set(true)), x)
        )

        const loop = (
          currentResult: S
        ): CH.Channel<R, InErr, CK.Chunk<In>, unknown, OutErr, CK.Chunk<L>, S> =>
          CH.foldChannel_(
            CH.doneCollect(self.channel),
            (_) => CH.fail(_),
            ({ tuple: [leftovers, doneValue] }) => {
              if (p(doneValue)) {
                return pipe(
                  CH.fromEffect(leftoversRef.set(CK.flatten(leftovers))),
                  CH.bind("upstreamDone", () => CH.fromEffect(upstreamDoneRef.get)),
                  CH.let("accumulatedResult", () => f(currentResult, doneValue)),
                  CH.bind("result", ({ accumulatedResult, upstreamDone }) =>
                    upstreamDone
                      ? CH.as_(CH.write(CK.flatten(leftovers)), currentResult)
                      : loop(accumulatedResult)
                  ),
                  CH.map(({ result }) => result)
                )
              } else {
                return CH.as_(CH.write(CK.flatten(leftovers)), currentResult)
              }
            }
          )

        return upstreamMarker[">>>"](CH.bufferChunk(leftoversRef))[">>>"](loop(z))
      })
    )
  )
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 *
 * @ets_data_first collectAllWhileWith_
 */
export function collectAllWhileWith<Z, S>(z: S, p: Predicate<Z>, f: (s: S, z: Z) => S) {
  return <R, InErr, In, OutErr, L extends In>(
    self: C.Sink<R, InErr, In, OutErr, L, Z>
  ) => collectAllWhileWith_(self, z, p, f)
}
