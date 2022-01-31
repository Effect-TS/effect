// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import * as E from "../../../Either/index.js"
import type * as Ex from "../../../Exit/index.js"
import { pipe } from "../../../Function/index.js"
import * as H from "../../../Hub/index.js"
import * as M from "../../../Managed/index.js"
import * as MH from "../Channel/_internal/mergeHelpers.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"
import * as UnwrapManaged from "./unwrapManaged.js"

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function raceBoth_<R, R1, InErr, InErr1, In, In1, OutErr, OutErr1, L, L1, Z, Z1>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  capacity = 16
): C.Sink<R1 & R, InErr & InErr1, In & In1, OutErr | OutErr1, L | L1, E.Either<Z, Z1>> {
  const managed = pipe(
    M.do,
    M.bind("hub", () =>
      T.toManaged(
        H.makeBounded<E.Either<Ex.Exit<InErr & InErr1, any>, CK.Chunk<In & In1>>>(
          capacity
        )
      )
    ),
    M.bind("c1", ({ hub }) => CH.fromHubManaged(hub)),
    M.bind("c2", ({ hub }) => CH.fromHubManaged(hub)),
    M.let("reader", ({ hub }) => CH.toHub(hub)),
    M.let("writer", ({ c1, c2 }) =>
      CH.mergeWith_(
        c1[">>>"](self.channel),
        c2[">>>"](that.channel),
        (selfDone) => MH.done(T.map_(T.done(selfDone), E.left)),
        (thatDone) => MH.done(T.map_(T.done(thatDone), E.right))
      )
    ),
    M.let("channel", ({ reader, writer }) =>
      CH.mergeWith_(
        reader,
        writer as CH.Channel<
          R1 & R,
          unknown,
          unknown,
          unknown,
          OutErr | OutErr1,
          CK.Chunk<L | L1>,
          E.Either<Z, Z1>
        >,
        (_) => MH.await_((_) => T.done(_)),
        (done) => MH.done(T.done(done))
      )
    ),
    M.map(({ channel }) => new C.Sink(channel))
  )

  return UnwrapManaged.unwrapManaged(managed)
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 *
 * @ets_data_first orElse_
 */
export function raceBoth<R1, InErr1, In1, OutErr1, L1, Z1>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  capacity = 16
) {
  return <R, InErr, In, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    raceBoth_(self, that, capacity)
}
