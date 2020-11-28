import * as A from "../../Array"
import * as C from "../../Cause/core"
import * as E from "../../Exit/api"
import { flow, pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Pull } from "../Pull"

export type Take<E, A> = E.Exit<O.Option<E>, A.Array<A>>

export const chunk = <A>(as: A.Array<A>): Take<never, A> => E.succeed(as)

export const halt = <E>(cause: C.Cause<E>): Take<E, never> =>
  E.halt(pipe(cause, C.map(O.some)))

export const end: Take<never, never> = E.fail(O.none)

export const done = <E, A>(take: Take<E, A>) => T.done(take)

export const fromPull = <R, E, O>(
  pull: Pull<R, E, O>
): T.Effect<R, never, Take<E, O>> =>
  pipe(
    pull,
    T.foldCause(
      (c) =>
        pipe(
          C.sequenceCauseOption(c),
          O.fold(() => end, halt)
        ),
      chunk
    )
  )

export function tap_<E, A, R, E1>(
  take: Take<E, A>,
  f: (as: ReadonlyArray<A>) => T.Effect<R, E1, any>
): T.Effect<R, E1, void> {
  return T.asUnit(E.foreach_(take, f))
}

export function tap<A, R, E1>(
  f: (as: ReadonlyArray<A>) => T.Effect<R, E1, any>
): <E>(take: E.Exit<O.Option<E>, ReadonlyArray<A>>) => T.Effect<R, E1, void> {
  return (take) => tap_(take, f)
}

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 */
export function fold_<E, A, Z>(
  take: Take<E, A>,
  end: Z,
  error: (cause: C.Cause<E>) => Z,
  value: (chunk: ReadonlyArray<A>) => Z
): Z {
  return E.fold_(
    take,
    flow(
      C.sequenceCauseOption,
      O.fold(() => end, error)
    ),
    value
  )
}

/**
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield a value.
 */
export function fold<E, A, Z>(
  end: Z,
  error: (cause: C.Cause<E>) => Z,
  value: (chunk: ReadonlyArray<A>) => Z
) {
  return (take: Take<E, A>) => fold_(take, end, error, value)
}

/**
 * Effectful version of `Take#fold`.
 *
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield an effect.
 */
export function foldM_<E, A, R, E1, Z>(
  take: Take<E, A>,
  end: () => T.Effect<R, E1, Z>,
  error: (cause: C.Cause<E>) => T.Effect<R, E1, Z>,
  value: (chunk: ReadonlyArray<A>) => T.Effect<R, E1, Z>
): T.Effect<R, E1, Z> {
  return E.foldM_(take, flow(C.sequenceCauseOption, O.fold(end, error)), value)
}

/**
 * Effectful version of `Take#fold`.
 *
 * Folds over the failure cause, success value and end-of-stream marker to
 * yield an effect.
 */
export function foldM<E, A, R, E1, Z>(
  end: () => T.Effect<R, E1, Z>,
  error: (cause: C.Cause<E>) => T.Effect<R, E1, Z>,
  value: (chunk: ReadonlyArray<A>) => T.Effect<R, E1, Z>
): (take: Take<E, A>) => T.Effect<R, E1, Z> {
  return (take) => foldM_(take, end, error, value)
}

export function map_<E, A, B>(take: Take<E, A>, f: (a: A) => B): Take<E, B> {
  return E.map_(take, A.map(f))
}

export function map<A, B>(
  f: (a: A) => B
): <E>(
  take: E.Exit<O.Option<E>, ReadonlyArray<A>>
) => E.Exit<O.Option<E>, ReadonlyArray<B>> {
  return (take) => map_(take, f)
}
