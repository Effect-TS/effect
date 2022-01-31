// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import * as P from "../../../../Promise/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function haltWhenP_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  p: P.Promise<E1, any>
): C.Stream<R, E | E1, A> {
  const writer = (): CH.Channel<
    R,
    E | E1,
    CK.Chunk<A>,
    unknown,
    E | E1,
    CK.Chunk<A>,
    void
  > =>
    CH.unwrap(
      T.map_(
        P.poll(p),
        O.fold(
          () =>
            CH.readWith(
              (in_) => CH.zipRight_(CH.write(in_), writer()),
              (err) => CH.fail(err),
              (_) => CH.unit
            ),
          (io) =>
            CH.unwrap(
              T.fold_(
                io,
                (_) => CH.fail(_),
                (_) => CH.unit
              )
            )
        )
      )
    )

  return new C.Stream(self.channel[">>>"](writer()))
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @ets_data_first haltWhenP_
 */
export function haltWhenP<E1>(p: P.Promise<E1, any>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => haltWhenP_(self, p)
}
