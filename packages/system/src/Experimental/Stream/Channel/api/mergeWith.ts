// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as F from "../../../../Fiber/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as MH from "../_internal/mergeHelpers.js"
import * as C from "../core.js"
import * as FromInput from "./fromInput.js"
import * as ToPull from "./toPull.js"
import * as Unwrap from "./unwrap.js"
import * as UnwrapManaged from "./unwrapManaged.js"
import * as ZipRight from "./zipRight.js"

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 */
export function mergeWith_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (
    ex: Ex.Exit<OutErr, OutDone>
  ) => MH.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (
    ex: Ex.Exit<OutErr1, OutDone1>
  ) => MH.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
): C.Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr2 | OutErr3,
  OutElem | OutElem1,
  OutDone2 | OutDone3
> {
  const m = pipe(
    M.do,
    M.bind("input", () =>
      T.toManaged(
        C.makeSingleProducerAsyncInput<
          InErr & InErr1,
          InElem & InElem1,
          InDone & InDone1
        >()
      )
    ),
    M.let("queueReader", ({ input }) => FromInput.fromInput(input)),
    M.bind("pullL", ({ queueReader }) => ToPull.toPull(queueReader[">>>"](self))),
    M.bind("pullR", ({ queueReader }) => ToPull.toPull(queueReader[">>>"](that))),
    M.chain(({ input, pullL, pullR, queueReader }) =>
      T.toManaged(
        T.transplant((graft) =>
          T.succeed({
            input,
            pullL: graft(pullL),
            pullR: graft(pullR),
            queueReader
          })
        )
      )
    ),
    M.map(({ input, pullL, pullR }) => {
      type MergeState = MH.MergeState<
        Env & Env1,
        OutErr,
        OutErr1,
        OutErr2 | OutErr3,
        OutElem | OutElem1,
        OutDone,
        OutDone1,
        OutDone2 | OutDone3
      >

      const handleSide =
        <Err, Done, Err2, Done2>(
          exit: Ex.Exit<Err, E.Either<Done, OutElem | OutElem1>>,
          fiber: F.Fiber<Err2, E.Either<Done2, OutElem | OutElem1>>,
          pull: T.Effect<Env & Env1, Err, E.Either<Done, OutElem | OutElem1>>
        ) =>
        (
          done: (
            ex: Ex.Exit<Err, Done>
          ) => MH.MergeDecision<
            Env & Env1,
            Err2,
            Done2,
            OutErr2 | OutErr3,
            OutDone2 | OutDone3
          >,
          both: (
            f1: F.Fiber<Err, E.Either<Done, OutElem | OutElem1>>,
            f2: F.Fiber<Err2, E.Either<Done2, OutElem | OutElem1>>
          ) => MergeState,
          single: (
            f: (
              ex: Ex.Exit<Err2, Done2>
            ) => T.Effect<Env & Env1, OutErr2 | OutErr3, OutDone2 | OutDone3>
          ) => MergeState
        ): T.Effect<
          Env & Env1,
          never,
          C.Channel<
            Env & Env1,
            unknown,
            unknown,
            unknown,
            OutErr2 | OutErr3,
            OutElem | OutElem1,
            OutDone2 | OutDone3
          >
        > => {
          const onDecision = (
            decision: MH.MergeDecision<
              Env & Env1,
              Err2,
              Done2,
              OutErr2 | OutErr3,
              OutDone2 | OutDone3
            >
          ): T.Effect<
            unknown,
            never,
            C.Channel<
              Env & Env1,
              unknown,
              unknown,
              unknown,
              OutErr2 | OutErr3,
              OutElem | OutElem1,
              OutDone2 | OutDone3
            >
          > => {
            MH.concrete(decision)
            if (decision._typeId === MH.DoneTypeId) {
              return T.succeed(
                C.fromEffect(T.zipRight_(F.interrupt(fiber), decision.io))
              )
            } else {
              return T.map_(
                fiber.await,
                Ex.fold(
                  (cause) => C.fromEffect(decision.f(Ex.halt(cause))),
                  E.fold(
                    (z) => C.fromEffect(decision.f(Ex.succeed(z))),
                    (elem) => ZipRight.zipRight_(C.write(elem), go(single(decision.f)))
                  )
                )
              )
            }
          }

          return Ex.fold_(
            exit,
            (failure) => onDecision(done(Ex.halt(failure))),
            E.fold(
              (z) => onDecision(done(Ex.succeed(z))),
              (elem) =>
                T.map_(T.forkDaemon(pull), (leftFiber) =>
                  ZipRight.zipRight_(C.write(elem), go(both(leftFiber, fiber)))
                )
            )
          )
        }

      const go = (
        state: MergeState
      ): C.Channel<
        Env & Env1,
        unknown,
        unknown,
        unknown,
        OutErr2 | OutErr3,
        OutElem | OutElem1,
        OutDone2 | OutDone3
      > => {
        if (state._typeId === MH.BothRunningTypeId) {
          const lj: T.Effect<
            Env1,
            OutErr,
            E.Either<OutDone, OutElem | OutElem1>
          > = F.join(state.left)
          const rj: T.Effect<
            Env1,
            OutErr1,
            E.Either<OutDone1, OutElem | OutElem1>
          > = F.join(state.right)

          return Unwrap.unwrap(
            T.raceWith_(
              lj,
              rj,
              (leftEx, _) =>
                handleSide(leftEx, state.right, pullL)(
                  leftDone,
                  (l, r) => new MH.BothRunning(l, r),
                  (_) => new MH.LeftDone(_)
                ),
              (rightEx, _) =>
                handleSide(rightEx, state.left, pullR)(
                  rightDone,
                  (l, r) => new MH.BothRunning(r, l),
                  (_) => new MH.RightDone(_)
                )
            )
          )
        } else if (state._typeId === MH.LeftDoneTypeId) {
          return Unwrap.unwrap(
            T.map_(
              T.result(pullR),
              Ex.fold(
                (cause) => C.fromEffect(state.f(Ex.halt(cause))),
                E.fold(
                  (z) => C.fromEffect(state.f(Ex.succeed(z))),
                  (elem) =>
                    ZipRight.zipRight_(C.write(elem), go(new MH.LeftDone(state.f)))
                )
              )
            )
          )
        } else {
          return Unwrap.unwrap(
            T.map_(
              T.result(pullL),
              Ex.fold(
                (cause) => C.fromEffect(state.f(Ex.halt(cause))),
                E.fold(
                  (z) => C.fromEffect(state.f(Ex.succeed(z))),
                  (elem) =>
                    ZipRight.zipRight_(C.write(elem), go(new MH.RightDone(state.f)))
                )
              )
            )
          )
        }
      }

      return pipe(
        C.fromEffect(
          T.zipWith_(
            T.forkDaemon(pullL),
            T.forkDaemon(pullR),
            (a, b): MergeState =>
              new MH.BothRunning<
                unknown,
                OutErr,
                OutErr1,
                unknown,
                OutElem | OutElem1,
                OutDone,
                OutDone1,
                unknown
              >(a, b)
          )
        ),
        C.chain(go),
        C.embedInput(input)
      )
    })
  )

  return UnwrapManaged.unwrapManaged(m)
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 *
 * @ets_data_first mergeWith_
 */
export function mergeWith<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutErr2,
  OutErr3,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (
    ex: Ex.Exit<OutErr, OutDone>
  ) => MH.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (
    ex: Ex.Exit<OutErr1, OutDone1>
  ) => MH.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mergeWith_(self, that, leftDone, rightDone)
}
