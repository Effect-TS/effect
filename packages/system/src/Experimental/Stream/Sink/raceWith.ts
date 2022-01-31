// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import type * as E from "../../../Either/index.js"
import type * as Ex from "../../../Exit/index.js"
import { pipe } from "../../../Function/index.js"
import * as H from "../../../Hub/index.js"
import * as M from "../../../Managed/index.js"
import * as MH from "../Channel/_internal/mergeHelpers.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"
import * as UnwrapManaged from "./unwrapManaged.js"

/**
 * Runs both sinks in parallel on the input, using the specified merge
 * function as soon as one result or the other has been computed.
 */
export function raceWith_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1,
  OutErr,
  OutErr1,
  L,
  L1,
  Z,
  Z1,
  Z2,
  Z3
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  leftDone: (ex: Ex.Exit<OutErr, Z>) => MH.MergeDecision<R1, OutErr1, Z1, OutErr1, Z2>,
  rightDone: (ex: Ex.Exit<OutErr1, Z1>) => MH.MergeDecision<R1, OutErr, Z, OutErr1, Z3>,
  capacity = 16
): C.Sink<R1 & R, InErr & InErr1, In & In1, OutErr1, L | L1, Z2 | Z3> {
  const managed = pipe(
    M.do,
    M.bind("hub", () =>
      T.toManaged(
        H.makeBounded<E.Either<Ex.Exit<InErr & InErr1, unknown>, CK.Chunk<In & In1>>>(
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
        leftDone,
        rightDone
      )
    ),
    M.let(
      "channel",
      ({
        reader,
        writer
      }): CH.Channel<
        R1 & R,
        InErr & InErr1,
        CK.Chunk<In & In1>,
        unknown,
        OutErr1,
        CK.Chunk<L | L1>,
        Z2 | Z3
      > =>
        CH.mergeWith_(
          reader,
          writer,
          (_) => MH.await_((_) => T.done(_)),
          (done) => MH.done(T.done(done))
        )
    ),
    M.map(({ channel }) => new C.Sink(channel))
  )

  return UnwrapManaged.unwrapManaged(managed)
}

/**
 * Runs both sinks in parallel on the input, using the specified merge
 * function as soon as one result or the other has been computed.
 *
 * @ets_data_first raceWith_
 */
export function raceWith<R1, InErr1, In1, OutErr, OutErr1, L1, Z, Z1, Z2, Z3>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  leftDone: (ex: Ex.Exit<OutErr, Z>) => MH.MergeDecision<R1, OutErr1, Z1, OutErr1, Z2>,
  rightDone: (ex: Ex.Exit<OutErr1, Z1>) => MH.MergeDecision<R1, OutErr, Z, OutErr1, Z3>,
  capacity = 16
) {
  return <R, InErr, In, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    raceWith_(self, that, leftDone, rightDone, capacity)
}
