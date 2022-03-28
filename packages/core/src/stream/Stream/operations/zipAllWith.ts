import type { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import { Exit } from "../../../io/Exit"
import type { Stream } from "../definition"
import { zipChunks } from "./_internal/zipChunks"

type State<A, A2> = DrainLeft | DrainRight | PullBoth | PullLeft<A2> | PullRight<A>

class DrainLeft {
  readonly _tag = "DrainLeft"
}

class DrainRight {
  readonly _tag = "DrainRight"
}

class PullBoth {
  readonly _tag = "PullBoth"
}

class PullLeft<A2> {
  readonly _tag = "PullLeft"
  constructor(readonly rightChunk: Chunk<A2>) {}
}

class PullRight<A> {
  readonly _tag = "PullRight"
  constructor(readonly leftChunk: Chunk<A>) {}
}

/**
 * Zips this stream with another point-wise. The provided functions will be
 * used to create elements for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different
 * lengths and one of the streams has ended before the other.
 *
 * @tsplus fluent ets/Stream zipAllWith
 */
export function zipAllWith_<R, E, A, R2, E2, A2, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  left: (a: A) => A3,
  right: (a2: A2) => A3,
  both: (a: A, a2: A2) => A3,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return self.combineChunks(
    that,
    (): State<A, A2> => new PullBoth(),
    pull(left, right, both)
  )
}

/**
 * Zips this stream with another point-wise. The provided functions will be
 * used to create elements for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different
 * lengths and one of the streams has ended before the other.
 */
export const zipAllWith = Pipeable(zipAllWith_)

function zipWithChunks<A, A2, A3>(
  leftChunk: Chunk<A>,
  rightChunk: Chunk<A2>,
  f: (a: A, a2: A2) => A3,
  __tsplusTrace?: string
): Tuple<[Chunk<A3>, State<A, A2>]> {
  const {
    tuple: [out, either]
  } = zipChunks(leftChunk, rightChunk, f)
  return either.fold(
    (leftChunk) =>
      leftChunk.isEmpty()
        ? Tuple(out, new PullBoth())
        : Tuple(out, new PullRight(leftChunk)),
    (rightChunk) =>
      rightChunk.isEmpty()
        ? Tuple(out, new PullBoth())
        : Tuple(out, new PullLeft(rightChunk))
  )
}

function pull<A, A2, A3>(
  left: (a: A) => A3,
  right: (a2: A2) => A3,
  both: (a: A, a2: A2) => A3
) {
  return <R, E, R2, E2>(
    state: State<A, A2>,
    pullLeft: Effect<R, Option<E>, Chunk<A>>,
    pullRight: Effect<R2, Option<E2>, Chunk<A2>>,
    __tsplusTrace?: string
  ): Effect<R & R2, never, Exit<Option<E | E2>, Tuple<[Chunk<A3>, State<A, A2>]>>> => {
    switch (state._tag) {
      case "DrainLeft": {
        return pullLeft.foldEffect(
          (err) => Effect.succeedNow(Exit.fail(err)),
          (leftChunk) =>
            Effect.succeedNow(Exit.succeed(Tuple(leftChunk.map(left), new DrainLeft())))
        )
      }
      case "DrainRight": {
        return pullRight.foldEffect(
          (err) => Effect.succeedNow(Exit.fail(err)),
          (rightChunk) =>
            Effect.succeedNow(
              Exit.succeed(Tuple(rightChunk.map(right), new DrainRight()))
            )
        )
      }
      case "PullBoth": {
        return pullLeft
          .unsome()
          .zipPar(pullRight.unsome())
          .foldEffect(
            (err) => Effect.succeedNow(Exit.fail(Option.some(err))),
            ({ tuple: [l, r] }) => {
              if (l._tag === "Some" && r._tag === "Some") {
                const leftChunk = l.value
                const rightChunk = r.value
                if (leftChunk.isEmpty() && rightChunk.isEmpty()) {
                  return pull(left, right, both)(new PullBoth(), pullLeft, pullRight)
                } else if (leftChunk.isEmpty()) {
                  return pull(left, right, both)(
                    new PullLeft(rightChunk),
                    pullLeft,
                    pullRight
                  )
                } else if (rightChunk.isEmpty()) {
                  return pull(left, right, both)(
                    new PullRight(leftChunk),
                    pullLeft,
                    pullRight
                  )
                } else {
                  return Effect.succeedNow(
                    Exit.succeed(zipWithChunks(leftChunk, rightChunk, both))
                  )
                }
              } else if (l._tag === "Some" && r._tag === "None") {
                return Effect.succeedNow(
                  Exit.succeed(Tuple(l.value.map(left), new DrainLeft()))
                )
              } else if (l._tag === "None" && r._tag === "Some") {
                return Effect.succeedNow(
                  Exit.succeed(Tuple(r.value.map(right), new DrainRight()))
                )
              } else {
                return Effect.succeedNow(Exit.fail(Option.none))
              }
            }
          )
      }
      case "PullLeft": {
        return pullLeft.foldEffect(
          (option) =>
            option.fold(
              Effect.succeedNow(
                Exit.succeed(Tuple(state.rightChunk.map(right), new DrainRight()))
              ),
              (err) => Effect.succeedNow(Exit.fail(Option.some(err)))
            ),
          (leftChunk) =>
            leftChunk.isEmpty()
              ? pull(left, right, both)(
                  new PullLeft(state.rightChunk),
                  pullLeft,
                  pullRight
                )
              : state.rightChunk.isEmpty()
              ? pull(left, right, both)(new PullRight(leftChunk), pullLeft, pullRight)
              : Effect.succeedNow(
                  Exit.succeed(zipWithChunks(leftChunk, state.rightChunk, both))
                )
        )
      }
      case "PullRight": {
        return pullRight.foldEffect(
          (option) =>
            option.fold(
              Effect.succeedNow(
                Exit.succeed(Tuple(state.leftChunk.map(left), new DrainLeft()))
              ),
              (err) => Effect.succeedNow(Exit.fail(Option.some(err)))
            ),
          (rightChunk) =>
            rightChunk.isEmpty()
              ? pull(left, right, both)(
                  new PullRight(state.leftChunk),
                  pullLeft,
                  pullRight
                )
              : state.leftChunk.isEmpty()
              ? pull(left, right, both)(new PullLeft(rightChunk), pullLeft, pullRight)
              : Effect.succeedNow(
                  Exit.succeed(zipWithChunks(state.leftChunk, rightChunk, both))
                )
        )
      }
    }
  }
}
