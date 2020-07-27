import * as E from "../../../Either"
import { pipe } from "../../../Function"
import * as O from "../../../Option"
import * as R from "../../Ref"
import * as BPull from "../bufferedPull"
import * as C from "../internal/cause"
import * as T from "../internal/effect"
import * as M from "../internal/managed"
import * as Pull from "../pull"
import * as Sink from "../sink"

/**
 * A `Stream<S, R, E, O>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `O`, may fail with errors of type `E`
 * and uses an environment of type `R` and can be sync or async `S`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * This data type can emit multiple `A` values through multiple calls to `next`.
 * Similarly, embedded inside every `Stream` is an Effect program: `Effect<S, R, Option<E>, O[]>`.
 * This program will be repeatedly evaluated as part of the stream execution. For
 * every evaluation, it will emit a chunk of values or end with an optional failure.
 * A failure of type `None` signals the end of the stream.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operators. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * The last important attribute of `Stream` is resource management: it makes
 * heavy use of `Managed` to manage resources that are acquired
 * and released during the stream's lifetime.
 *
 * `Stream` forms a monad on its `O` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 *
 * The current encoding of `Stream` is *not* safe for recursion. `Stream` programs
 * that are defined in terms of themselves will leak memory.
 *
 * Instead, recursive operators must be defined explicitly. See the definition of
 * `forever` for an example. This limitation will be lifted in the future.
 */
export class Stream<S, R, E, O> {
  constructor(
    readonly proc: M.Managed<S, R, never, T.Effect<S, R, O.Option<E>, O[]>>
  ) {}
}

/**
 * Type aliases
 */
export type Sync<O> = Stream<never, unknown, never, O>

/**
 * The default chunk size used by the various combinators and constructors of [[Stream]].
 */
export const DefaultChunkSize = 4096

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export const fromEffectOption = <S, R, E, A>(
  fa: T.Effect<S, R, O.Option<E>, A>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("doneRef", () => pipe(R.makeRef(false), T.toManaged)),
      M.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          R.modify((b) =>
            b
              ? [Pull.end, true]
              : [
                  pipe(
                    fa,
                    T.map((a) => [a])
                  ),
                  true
                ]
          ),
          T.flatten
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export const fromEffect = <S, R, E, A>(fa: T.Effect<S, R, E, A>): Stream<S, R, E, A> =>
  pipe(fa, T.mapError(O.some), fromEffectOption)

/**
 * Creates a stream from an array of values
 */
export const fromArray = <O>(c: O[]): Sync<O> =>
  new Stream(
    pipe(
      R.makeRef(false),
      T.map((doneRef) =>
        pipe(
          doneRef,
          R.modify((done): [T.SyncE<O.Option<never>, O[]>, boolean] =>
            done || c.length === 0 ? [Pull.end, true] : [T.succeedNow(c), true]
          ),
          T.flatten
        )
      ),
      T.toManaged
    )
  )

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const runManaged = <S1, R1, E1, O, B>(
  sink: Sink.Sink<S1, R1, E1, O, any, B>
) => <S, R, E>(self: Stream<S, R, E, O>): M.Managed<S1 | S, R & R1, E1 | E, B> =>
  pipe(
    M.zip_(self.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: T.Effect<S1 | S, R1 & R, E1 | E, B> = T.foldCauseM_(
        pull,
        (c): T.Effect<S1, R1, E1 | E, B> =>
          pipe(
            C.sequenceCauseOption(c),
            O.fold(
              () =>
                T.foldCauseM_(
                  push(O.none),
                  (c) =>
                    pipe(
                      c,
                      C.map(([_]) => _),
                      C.sequenceCauseEither,
                      E.fold(T.halt, T.succeedNow)
                    ),
                  () => T.die("empty stream / empty sinks")
                ),
              T.halt
            )
          ),
        (os) =>
          T.foldCauseM_(
            push(O.some(os)),
            (c): T.Effect<never, unknown, E1, B> =>
              pipe(
                c,
                C.map(([_]) => _),
                C.sequenceCauseEither,
                E.fold(T.halt, T.succeedNow)
              ),
            () => go
          )
      )
      return go
    })
  )

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run = <S1, R1, E1, O, B>(sink: Sink.Sink<S1, R1, E1, O, any, B>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): T.Effect<S1 | S, R & R1, E1 | E, B> => pipe(self, runManaged(sink), M.useNow)

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runCollect = <S, R, E, O>(
  self: Stream<S, R, E, O>
): T.Effect<S, R, E, O[]> => pipe(self, run(Sink.collectAll<O>()))

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export const mapM = <O, S1, R1, E1, O1>(f: (o: O) => T.Effect<S1, R1, E1, O1>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): Stream<S | S1, R & R1, E | E1, O1> =>
  new Stream<S | S1, R & R1, E | E1, O1>(
    pipe(
      self.proc,
      M.mapM(BPull.make),
      M.map((pull) =>
        pipe(
          pull,
          BPull.pullElements,
          T.chain((o) =>
            pipe(
              f(o),
              T.bimap(O.some, (o1) => [o1] as [O1])
            )
          )
        )
      )
    )
  )
