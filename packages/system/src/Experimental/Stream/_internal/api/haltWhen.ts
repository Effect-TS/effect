// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as Ex from "../../../../Exit/index.js"
import type * as F from "../../../../Fiber/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  io: T.Effect<R1, E1, any>
): C.Stream<R1 & R, E | E1, A> {
  const writer = (
    fiber: F.Fiber<E | E1, any>
  ): CH.Channel<R1, E | E1, CK.Chunk<A>, unknown, E | E1, CK.Chunk<A>, void> =>
    CH.unwrap(
      T.map_(
        fiber.poll,
        O.fold(
          () =>
            CH.readWith(
              (in_) => CH.zipRight_(CH.write(in_), writer(fiber)),
              (err) => CH.fail(err),
              (_) => CH.unit
            ),
          (exit) =>
            Ex.fold_(
              exit,
              (_) => CH.failCause(_),
              (_) =>
                CH.unit as CH.Channel<
                  R1,
                  E | E1,
                  CK.Chunk<A>,
                  unknown,
                  E | E1,
                  CK.Chunk<A>,
                  void
                >
            )
        )
      )
    )

  return new C.Stream(
    CH.unwrapManaged(
      M.map_(T.forkManaged(io), (fiber) => self.channel[">>>"](writer(fiber)))
    )
  )
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 *
 * @ets_data_first haltWhen_
 */
export function haltWhen<R1, E1>(io: T.Effect<R1, E1, any>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => haltWhen_(self, io)
}
