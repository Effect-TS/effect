import type { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"
import { concreteMergeDecision } from "@effect/core/stream/Channel/MergeDecision"
import { MergeState } from "@effect/core/stream/Channel/MergeState"
import { SingleProducerAsyncInput } from "@effect/core/stream/Channel/SingleProducerAsyncInput"

/**
 * Returns a new channel, which is the merge of this channel and the specified
 * channel, where the behavior of the returned channel on left or right early
 * termination is decided by the specified `leftDone` and `rightDone` merge
 * decisions.
 *
 * @tsplus static effect/core/stream/Channel.Aspects mergeWith
 * @tsplus pipeable effect/core/stream/Channel mergeWith
 */
export function mergeWith_<
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
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (
    ex: Exit<OutErr, OutDone>
  ) => MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (
    ex: Exit<OutErr1, OutDone1>
  ) => MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr2 | OutErr3,
    OutElem | OutElem1,
    OutDone2 | OutDone3
  > =>
    Channel.unwrapScoped(
      Do(($) => {
        const input = $(SingleProducerAsyncInput.make<
          InErr & InErr1,
          InElem & InElem1,
          InDone & InDone1
        >())
        const queueReader = Channel.fromInput(input)
        const pullL = $((queueReader >> self).toPull)
        const pullR = $((queueReader >> that).toPull)
        type State = MergeState<
          Env | Env1,
          OutErr,
          OutErr1,
          OutErr2 | OutErr3,
          OutElem | OutElem1,
          OutDone,
          OutDone1,
          OutDone2 | OutDone3
        >

        const handleSide = <Err, Done, Err2, Done2>(
          exit: Exit<Err, Either<Done, OutElem | OutElem1>>,
          fiber: Fiber<Err2, Either<Done2, OutElem | OutElem1>>,
          pull: Effect<Env | Env1, Err, Either<Done, OutElem | OutElem1>>
        ) =>
          (
            done: (
              ex: Exit<Err, Done>
            ) => MergeDecision<
              Env | Env1,
              Err2,
              Done2,
              OutErr2 | OutErr3,
              OutDone2 | OutDone3
            >,
            both: (
              f1: Fiber<Err, Either<Done, OutElem | OutElem1>>,
              f2: Fiber<Err2, Either<Done2, OutElem | OutElem1>>
            ) => State,
            single: (
              f: (
                ex: Exit<Err2, Done2>
              ) => Effect<Env | Env1, OutErr2 | OutErr3, OutDone2 | OutDone3>
            ) => State
          ): Effect<
            Env | Env1,
            never,
            Channel<
              Env | Env1,
              unknown,
              unknown,
              unknown,
              OutErr2 | OutErr3,
              OutElem | OutElem1,
              OutDone2 | OutDone3
            >
          > => {
            const onDecision = (
              decision: MergeDecision<
                Env | Env1,
                Err2,
                Done2,
                OutErr2 | OutErr3,
                OutDone2 | OutDone3
              >
            ): Effect<
              never,
              never,
              Channel<
                Env | Env1,
                unknown,
                unknown,
                unknown,
                OutErr2 | OutErr3,
                OutElem | OutElem1,
                OutDone2 | OutDone3
              >
            > => {
              concreteMergeDecision(decision)
              if (decision._tag === "Done") {
                return Effect.sync(Channel.fromEffect(fiber.interrupt.zipRight(decision.io)))
              }
              return fiber.await.map((exit) =>
                exit.fold(
                  (cause) => Channel.fromEffect(decision.f(Exit.failCause(cause))),
                  (either) =>
                    either.fold(
                      (done) => Channel.fromEffect(decision.f(Exit.succeed(done))),
                      (elem) => Channel.write(elem).zipRight(go(single(decision.f)))
                    )
                )
              )
            }

            return exit.fold(
              (cause) => onDecision(done(Exit.failCause(cause))),
              (either) =>
                either.fold(
                  (z) => onDecision(done(Exit.succeed(z))),
                  (elem) =>
                    Effect.sync(
                      Channel.write(elem) >
                        Channel.fromEffect(pull.forkDaemon).flatMap((leftFiber) =>
                          go(both(leftFiber, fiber))
                        )
                    )
                )
            )
          }

        const go = (
          state: State
        ): Channel<
          Env | Env1,
          unknown,
          unknown,
          unknown,
          OutErr2 | OutErr3,
          OutElem | OutElem1,
          OutDone2 | OutDone3
        > => {
          switch (state._tag) {
            case "BothRunning": {
              const lj: Effect<
                Env1,
                OutErr,
                Either<OutDone, OutElem | OutElem1>
              > = state.left.join
              const rj: Effect<
                Env1,
                OutErr1,
                Either<OutDone1, OutElem | OutElem1>
              > = state.right.join

              return Channel.unwrap(
                lj.raceWith(
                  rj,
                  (leftEx, _) =>
                    handleSide(leftEx, state.right, pullL)(
                      leftDone,
                      (l, r) => MergeState.BothRunning(l, r),
                      (_) => MergeState.LeftDone(_)
                    ),
                  (rightEx, _) =>
                    handleSide(rightEx, state.left, pullR)(
                      rightDone,
                      (l, r) => MergeState.BothRunning(r, l),
                      (_) => MergeState.RightDone(_)
                    )
                )
              )
            }
            case "LeftDone": {
              return Channel.unwrap(
                pullR.exit.map((exit) =>
                  exit.fold(
                    (cause) => Channel.fromEffect(state.f(Exit.failCause(cause))),
                    (either) =>
                      either.fold(
                        (done) => Channel.fromEffect(state.f(Exit.succeed(done))),
                        (elem) => Channel.write(elem) > go(MergeState.LeftDone(state.f))
                      )
                  )
                )
              )
            }
            case "RightDone": {
              return Channel.unwrap(
                pullL.exit.map((exit) =>
                  exit.fold(
                    (cause) => Channel.fromEffect(state.f(Exit.failCause(cause))),
                    (either) =>
                      either.fold(
                        (done) => Channel.fromEffect(state.f(Exit.succeed(done))),
                        (elem) => Channel.write(elem) > go(MergeState.RightDone(state.f))
                      )
                  )
                )
              )
            }
          }
        }

        return Channel.fromEffect(
          pullL
            .forkDaemon
            .zipWith(
              pullR.forkDaemon,
              (left, right): State =>
                MergeState.BothRunning<
                  Env | Env1,
                  OutErr,
                  OutErr1,
                  OutErr2 | OutErr3,
                  OutElem | OutElem1,
                  OutDone,
                  OutDone1,
                  OutDone2 | OutDone3
                >(left, right)
            )
        )
          .flatMap(go)
          .embedInput(input)
      })
    )
}
