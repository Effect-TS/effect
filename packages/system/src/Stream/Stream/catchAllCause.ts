import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as C from "../../Cause/core"
import * as Exit from "../../Exit/api"
import { pipe } from "../../Function"
import type { Finalizer, ReleaseMap } from "../../Managed"
import { makeReleaseMap, noop } from "../../Managed"
import { coerceSE } from "../../Managed/deps"
import * as Option from "../../Option"
import * as Ref from "../../Ref"
import type * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export const catchAllCause = <E, S1, R1, E2, O1>(
  f: (e: C.Cause<E>) => Stream<S1, R1, E2, O1>
) => <S, R, O>(self: Stream<S, R, E, O>): Stream<S1 | S, R & R1, E2, O1 | O> => {
  type NotStarted = { _tag: "NotStarted" }
  type Self<E0> = { _tag: "Self"; pull: Pull.Pull<S, R, E0, O> }
  type Other = { _tag: "Other"; pull: Pull.Pull<S1, R1, E2, O1> }
  type State<E0> = NotStarted | Self<E0> | Other

  return new Stream<S | S1, R & R1, E2, O | O1>(
    pipe(
      M.of,
      M.bind(
        "finalizerRef",
        () => M.finalizerRef(noop) as M.Managed<S, R, never, Ref.Ref<Finalizer>>
      ),
      M.bind("ref", () =>
        pipe(
          Ref.makeRef<State<E>>({ _tag: "NotStarted" }),
          T.toManaged()
        )
      ),
      M.let("pull", ({ finalizerRef, ref }) => {
        const closeCurrent = (cause: C.Cause<any>) =>
          pipe(
            finalizerRef,
            Ref.getAndSet(noop),
            T.chain((f) => f(Exit.halt(cause))),
            T.uninterruptible,
            coerceSE<S | S1, Option.Option<E2>>()
          )

        const open = <S, R, E0, O>(stream: Stream<S, R, E0, O>) => (
          asState: (_: Pull.Pull<S, R, E0, O>) => State<E>
        ) =>
          T.uninterruptibleMask(({ restore }) =>
            pipe(
              makeReleaseMap,
              T.chain((releaseMap) =>
                pipe(
                  finalizerRef.set((exit) => releaseMap.releaseAll(exit, T.sequential)),
                  T.chain(() =>
                    pipe(
                      restore(coerceSE<S, Option.Option<E0>>()(stream.proc.effect)),
                      T.provideSome((_: R) => [_, releaseMap] as [R, ReleaseMap]),
                      T.map(([_, __]) => __),
                      T.tap((pull) => ref.set(asState(pull)))
                    )
                  )
                )
              )
            )
          )

        const failover = (cause: C.Cause<Option.Option<E>>) =>
          pipe(
            cause,
            C.sequenceCauseOption,
            Option.fold(
              () => T.fail(Option.none),
              (cause) =>
                pipe(
                  closeCurrent(cause),
                  T.chain(() =>
                    open(f(cause))((pull) => ({
                      _tag: "Other",
                      pull
                    }))
                  ),
                  T.flatten
                )
            )
          )

        return pipe(
          ref.get,
          T.chain((s) => {
            switch (s._tag) {
              case "NotStarted": {
                return pipe(
                  open(self)((pull) => ({ _tag: "Self", pull })),
                  T.flatten,
                  T.catchAllCause(failover)
                )
              }
              case "Self": {
                return pipe(s.pull, T.catchAllCause(failover))
              }
              case "Other": {
                return s.pull
              }
            }
          })
        )
      }),
      M.map(({ pull }) => pull)
    )
  )
}
