// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import type * as E from "../../../Either/index.js"
import * as Ex from "../../../Exit/index.js"
import { pipe } from "../../../Function/index.js"
import * as H from "../../../Hub/index.js"
import * as M from "../../../Managed/index.js"
import * as MH from "../Channel/_internal/mergeHelpers.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 */
export function zipWithPar_<
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
  Z2
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2,
  capacity = 16
): C.Sink<R1 & R, InErr & InErr1, In & In1, OutErr | OutErr1, L | L1, Z2> {
  const channel: CH.Channel<
    R1 & R,
    InErr & InErr1,
    CK.Chunk<In & In1>,
    unknown,
    OutErr | OutErr1,
    CK.Chunk<L | L1>,
    Z2
  > = CH.unwrapManaged(
    pipe(
      M.do,
      M.bind("hub", () =>
        T.toManaged(
          H.makeBounded<E.Either<Ex.Exit<InErr & InErr1, unknown>, CK.Chunk<In & In1>>>(
            capacity
          )
        )
      ),
      M.bind("left", ({ hub }) => CH.fromHubManaged(hub)),
      M.bind("right", ({ hub }) => CH.fromHubManaged(hub)),
      M.let("reader", ({ hub }) => CH.toHub(hub)),
      M.let("c1", ({ left }) => left[">>>"](self.channel)),
      M.let("c2", ({ right }) => right[">>>"](that.channel)),
      M.let("writer", ({ c1, c2 }) =>
        CH.mergeWith_(
          c1,
          c2,
          Ex.fold(
            (err): MH.MergeDecision<unknown, OutErr1, Z1, OutErr | OutErr1, Z2> =>
              MH.done(T.halt(err)),
            (lz) =>
              MH.await_(
                Ex.fold(
                  (cause) => T.halt(cause),
                  (rz) => T.succeed(f(lz, rz))
                )
              )
          ),
          Ex.fold(
            (err): MH.MergeDecision<unknown, OutErr, Z, OutErr | OutErr1, Z2> =>
              MH.done(T.halt(err)),
            (rz) =>
              MH.await_(
                Ex.fold(
                  (cause) => T.halt(cause),
                  (lz) => T.succeed(f(lz, rz))
                )
              )
          )
        )
      ),
      M.map(({ reader, writer }) =>
        CH.mergeWith_(
          reader,
          writer,
          (_) =>
            MH.await_(
              Ex.fold(
                (cause) => T.halt(cause),
                (z) => T.succeed(z)
              )
            ),
          Ex.fold(
            (cause) => MH.done(T.halt(cause)),
            (z) => MH.done(T.succeed(z))
          )
        )
      )
    )
  )

  return new C.Sink(channel)
}

/**
 * Runs both sinks in parallel on the input and combines the results
 * using the provided function.
 *
 * @ets_data_first zipWithPar_
 */
export function zipWithPar<R1, InErr1, In1, OutErr1, L1, Z, Z1, Z2>(
  that: C.Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2,
  capacity = 16
) {
  return <R, InErr, In, OutErr, L>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    zipWithPar_(self, that, f, capacity)
}
