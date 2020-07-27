import * as E from "../../../Either"
import { pipe } from "../../../Function"
import * as O from "../../../Option"
import * as R from "../../Ref"
import * as T from "../internal/effect"
import * as M from "../internal/managed"

// Important notes while writing sinks and combinators:
// - What return values for sinks mean:
//   Effect.unit - "need more values"
//   Effect.fail([Either.Right(z), l]) - "ended with z and emit leftover l"
//   Effect.fail([Either.Left(e), l]) - "failed with e and emit leftover l"
// - Result of processing of the stream using the sink must not depend on how the stream is chunked
//   (chunking-invariance)
//   pipe(stream, run(sink), Effect.either) === pipe(stream, chunkN(1), run(sink), Effect.either)
// - Sinks should always end when receiving a `None`. It is a defect to not end with some
//   sort of result (even a failure) when receiving a `None`.
// - Sinks can assume they will not be pushed again after emitting a value.
export class Sink<S, R, E, I, L, Z> {
  constructor(readonly push: M.Managed<S, R, never, Push<S, R, E, I, L, Z>>) {}
}

export type Push<S, R, E, I, L, Z> = (
  _: O.Option<I[]>
) => T.Effect<S, R, [E.Either<E, Z>, L[]], void>

export const emit = <I, Z>(
  z: Z,
  leftover: I[]
): T.SyncE<[E.Either<never, Z>, I[]], never> => T.fail([E.right(z), leftover])

export const fromPush = <S, R, E, I, L, Z>(push: Push<S, R, E, I, L, Z>) =>
  new Sink(M.succeedNow(push))

export const succeed = <Z, I>(z: Z): Sink<never, unknown, never, I, I, Z> =>
  fromPush<never, unknown, never, I, I, Z>((c) => {
    const leftover = O.fold_(
      c,
      () => [] as I[],
      (x) => x
    )

    return emit(z, leftover)
  })

export const more = T.unit

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export const foldArraysM = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I, S, R, E>(
  f: (s: Z, i: I[]) => T.Effect<S, R, E, Z>
): Sink<S, R, E, I, I, Z> => {
  if (contFn(z)) {
    return new Sink(
      pipe(
        M.of,
        M.bind("state", () => pipe(R.makeRef(z), T.toManaged)),
        M.let("push", ({ state }) => (is: O.Option<I[]>) => {
          switch (is._tag) {
            case "None": {
              return pipe(
                state.get,
                T.chain((s) => emit(s, []))
              )
            }
            case "Some": {
              return pipe(
                state.get,
                T.chain((s) =>
                  pipe(
                    f(s, is.value),
                    T.mapError((e) => [E.left(e), []] as [E.Either<E, never>, I[]]),
                    T.chain((s) =>
                      contFn(s)
                        ? pipe(
                            state.set(s),
                            T.chain(() => more)
                          )
                        : emit(s, [])
                    )
                  )
                )
              )
            }
          }
        }),
        M.map(({ push }) => push)
      )
    )
  } else {
    return succeed<Z, I>(z)
  }
}

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export const foldArrays = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I>(
  f: (s: Z, i: I[]) => Z
): Sink<never, unknown, never, I, I, Z> =>
  foldArraysM(z)(contFn)((z, i: I[]) => T.succeedNow(f(z, i)))

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export const foldLeftArrays = <Z>(z: Z) => <I>(f: (s: Z, i: I[]) => Z) =>
  foldArrays(z)(() => true)(f)

/**
 * A sink that collects all of its inputs into an array.
 */
export const collectAll = <A>(): Sink<never, unknown, never, A, A, A[]> =>
  foldLeftArrays([] as A[])((s, i: A[]) => [...s, ...i])
