// ets_tracing: off

import "../../Operator/index.js"

import * as C from "../../Cause/core.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as E from "../../Exit/api.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Pull } from "../Pull/index.js"

export type Take<E, A> = E.Exit<O.Option<E>, A.Chunk<A>>

export function chunk<A>(as: A.Chunk<A>): Take<never, A> {
  return E.succeed(as)
}

export function halt<E>(cause: C.Cause<E>): Take<E, never> {
  return E.halt(pipe(cause, C.map(O.some)))
}

export const end: Take<never, never> = E.fail(O.none)

export function done<E, A>(take: Take<E, A>) {
  return T.done(take)
}

export function fromPull<R, E, O>(pull: Pull<R, E, O>): T.Effect<R, never, Take<E, O>> {
  return pipe(
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
}

export function tap_<E, A, R, E1, X>(
  take: Take<E, A>,
  f: (as: A.Chunk<A>) => T.Effect<R, E1, X>
): T.Effect<R, E1, void> {
  return T.asUnit(E.forEach_(take, f))
}

export function tap<A, R, E1, X>(
  f: (as: A.Chunk<A>) => T.Effect<R, E1, X>
): <E>(take: E.Exit<O.Option<E>, A.Chunk<A>>) => T.Effect<R, E1, void> {
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
  value: (chunk: A.Chunk<A>) => Z
): Z {
  return E.fold_(
    take,
    (x) =>
      pipe(
        x,
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
  value: (chunk: A.Chunk<A>) => Z
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
  value: (chunk: A.Chunk<A>) => T.Effect<R, E1, Z>
): T.Effect<R, E1, Z> {
  return E.foldM_(
    take,
    (x) => pipe(x, C.sequenceCauseOption, O.fold(end, error)),
    value
  )
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
  value: (chunk: A.Chunk<A>) => T.Effect<R, E1, Z>
): (take: Take<E, A>) => T.Effect<R, E1, Z> {
  return (take) => foldM_(take, end, error, value)
}

export function map_<E, A, B>(take: Take<E, A>, f: (a: A) => B): Take<E, B> {
  return E.map_(take, A.map(f))
}

export function map<A, B>(
  f: (a: A) => B
): <E>(take: E.Exit<O.Option<E>, A.Chunk<A>>) => E.Exit<O.Option<E>, A.Chunk<B>> {
  return (take) => map_(take, f)
}
