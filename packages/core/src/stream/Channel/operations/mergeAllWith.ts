import { MergeStrategy } from "@effect/core/stream/Channel/MergeStrategy"
import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Channel.Ops mergeAllWith
 * @category mutations
 * @since 1.0.0
 */
export function mergeAllWith<
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
  OutElem,
  OutDone
>(
  channels: Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  n: number,
  f: (o1: OutDone, o2: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = MergeStrategy.BackPressure
): Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> {
  return Channel.unwrapScoped(
    Effect.withChildren((getChildren) =>
      Do(($) => {
        $(Effect.addFinalizer(getChildren.flatMap(Fiber.interruptAll)))
        const queue = $(Effect.acquireRelease(
          Queue.bounded<Effect<Env, OutErr | OutErr1, Either.Either<OutDone, OutElem>>>(
            bufferSize
          ),
          (queue) => queue.shutdown
        ))
        const cancelers = $(Effect.acquireRelease(
          Queue.unbounded<Deferred<never, void>>(),
          (queue) => queue.shutdown
        ))
        const lastDone = $(Ref.make<Option.Option<OutDone>>(Option.none))
        const errorSignal = $(Deferred.make<never, void>())
        const permits = $(TSemaphore.makeCommit(n))
        const pull = $(channels.toPull)
        const evaluatePull = (
          pull: Effect<Env | Env1, OutErr | OutErr1, Either.Either<OutDone, OutElem>>
        ) =>
          pull
            .flatMap((either) => {
              switch (either._tag) {
                case "Left": {
                  return Effect.succeed(Option.some(either.left))
                }
                case "Right": {
                  return queue.offer(Effect.succeed(Either.right(either.right))).as(Option.none)
                }
              }
            })
            .repeatUntil(Option.isSome)
            .flatMap((option) => {
              switch (option._tag) {
                case "None": {
                  return Effect.unit
                }
                case "Some": {
                  const outDone = option.value
                  return lastDone.update((option) => {
                    switch (option._tag) {
                      case "None": {
                        return Option.some(outDone)
                      }
                      case "Some": {
                        return Option.some(f(option.value, outDone))
                      }
                    }
                  })
                }
              }
            })
            .catchAllCause(
              (cause) =>
                queue.offer(Effect.failCause(cause)).zipRight(
                  errorSignal.succeed(undefined).unit
                )
            )
        $(
          pull.foldCauseEffect(
            (cause) =>
              getChildren
                .flatMap(Fiber.interruptAll)
                .zipRight(queue.offer(Effect.failCause(cause)).as(false)),
            (either) => {
              switch (either._tag) {
                case "Left": {
                  const outDone = either.left
                  return errorSignal.await.raceWith(
                    permits.withPermits(n)(Effect.unit),
                    (_, permitAcquisition) =>
                      getChildren
                        .flatMap(Fiber.interruptAll)
                        .zipRight(permitAcquisition.interrupt.as(false)),
                    (_, failureAwait) =>
                      failureAwait.interrupt.zipRight(
                        lastDone.get.flatMap((option) => {
                          switch (option._tag) {
                            case "None": {
                              return queue.offer(Effect.succeed(Either.left(outDone)))
                            }
                            case "Some": {
                              return queue.offer(Effect.sync(Either.left(f(option.value, outDone))))
                            }
                          }
                        })
                      )
                  )
                }
                case "Right": {
                  const channel = either.right
                  switch (mergeStrategy._tag) {
                    case "BackPressure": {
                      return Do(($) => {
                        const latch = $(Deferred.make<never, void>())
                        const raceIOs = Effect.scoped(
                          channel.toPull.flatMap((pull) =>
                            evaluatePull(pull).race(errorSignal.await)
                          )
                        )
                        $(permits.withPermit(latch.succeed(undefined).zipRight(raceIOs)).fork)
                        $(latch.await)
                        const errored = $(errorSignal.isDone)
                        return !errored
                      })
                    }
                    case "BufferSliding": {
                      return Do(($) => {
                        const canceler = $(Deferred.make<never, void>())
                        const latch = $(Deferred.make<never, void>())
                        const size = $(cancelers.size)
                        $(Effect.when(
                          size >= n,
                          cancelers.take.flatMap((deferred) => deferred.succeed(undefined))
                        ))
                        $(cancelers.offer(canceler))
                        const raceIOs = Effect.scoped(
                          channel.toPull.flatMap((pull) =>
                            evaluatePull(pull)
                              .race(errorSignal.await)
                              .race(canceler.await)
                          )
                        )
                        $(permits.withPermit(latch.succeed(undefined).zipRight(raceIOs)).fork)
                        $(latch.await)
                        const errored = $(errorSignal.isDone)
                        return !errored
                      })
                    }
                  }
                }
              }
            }
          ).repeatWhileEquals(true).forkScoped
        )
        return queue
      })
    ).map((queue) => {
      const consumer: Channel<
        Env | Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
        OutDone
      > = Channel.unwrap(
        queue.take.flatten.foldCause(
          (cause) => Channel.failCause(cause),
          (either) => {
            switch (either._tag) {
              case "Left": {
                return Channel.succeed(either.left)
              }
              case "Right": {
                return Channel.write(either.right).flatMap(() => consumer)
              }
            }
          }
        )
      )
      return consumer
    })
  )
}
