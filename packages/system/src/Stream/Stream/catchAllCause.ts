// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import * as Finalizer from "../../Managed/ReleaseMap/finalizer.js"
import type * as RM from "../../Managed/ReleaseMap/index.js"
import * as makeReleaseMap from "../../Managed/ReleaseMap/makeReleaseMap.js"
import * as releaseAll from "../../Managed/ReleaseMap/releaseAll.js"
import * as Option from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import type * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, E, R1, E2, O, O1>(
  self: Stream<R, E, O>,
  f: (e: C.Cause<E>) => Stream<R1, E2, O1>
): Stream<R & R1, E2, O1 | O> {
  type NotStarted = { _tag: "NotStarted" }
  type Self<E0> = { _tag: "Self"; pull: Pull.Pull<R, E0, O> }
  type Other = { _tag: "Other"; pull: Pull.Pull<R1, E2, O1> }
  type State<E0> = NotStarted | Self<E0> | Other

  return new Stream<R & R1, E2, O | O1>(
    pipe(
      M.do,
      M.bind(
        "finalizerRef",
        () =>
          M.finalizerRef(Finalizer.noopFinalizer) as M.Managed<
            R,
            never,
            Ref.Ref<RM.Finalizer>
          >
      ),
      M.bind("ref", () =>
        pipe(Ref.makeRef<State<E>>({ _tag: "NotStarted" }), T.toManaged)
      ),
      M.let("pull", ({ finalizerRef, ref }) => {
        const closeCurrent = (cause: C.Cause<any>) =>
          pipe(
            finalizerRef,
            Ref.getAndSet(Finalizer.noopFinalizer),
            T.chain((f) => f(Ex.halt(cause))),
            T.uninterruptible
          )

        const open =
          <R, E0, O>(stream: Stream<R, E0, O>) =>
          (asState: (_: Pull.Pull<R, E0, O>) => State<E>) =>
            T.uninterruptibleMask(({ restore }) =>
              pipe(
                makeReleaseMap.makeReleaseMap,
                T.chain((releaseMap) =>
                  pipe(
                    finalizerRef.set((exit) =>
                      releaseAll.releaseAll(exit, T.sequential)(releaseMap)
                    ),
                    T.chain(() =>
                      pipe(
                        restore(stream.proc.effect),
                        T.provideSome((_: R) => Tp.tuple(_, releaseMap)),
                        T.map(({ tuple: [_, __] }) => __),
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

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause<R, E, R1, E2, O, O1>(
  f: (e: C.Cause<E>) => Stream<R1, E2, O1>
) {
  return (self: Stream<R, E, O>) => catchAllCause_(self, f)
}
