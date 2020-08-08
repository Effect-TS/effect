import { pipe } from "../../../../Function"
import { CovariantF, CovariantK } from "../Covariant"
import { HasURI, HKT, HKT8, KindEx, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S, I, O = I>() => HKT8<
    F,
    I,
    O,
    never,
    unknown,
    S,
    unknown,
    never,
    unknown
  >
}

export interface AnyK<F extends URIS> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S, I, O = I>() => KindEx<
    F,
    I,
    O,
    never,
    unknown,
    S,
    unknown,
    never,
    unknown
  >
}

export function succeedF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <A, S, I, O = I, X = never>(
  a: A
) => KindEx<F, I, O, X, unknown, S, unknown, never, A>
export function succeedF<F>(
  F: AnyF<F> & CovariantF<F>
): <A, S, I, O = I, X = never>(a: A) => HKT8<F, I, O, X, unknown, S, unknown, never, A>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

export function anyF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <I, O, X, In, S, R, E, A>(a: A) => KindEx<F, I, O, X, In, S, R, E, A>
export function anyF<F>(
  F: AnyF<F> & CovariantF<F>
): <I, O, X, In, S, R, E, A>(a: A) => HKT8<F, I, O, X, In, S, R, E, A>
export function anyF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

export function makeAny<URI extends URIS>(
  _: URI
): (_: Omit<AnyK<URI>, "URI" | "Any">) => AnyK<URI>
export function makeAny<URI>(URI: URI): (_: Omit<AnyF<URI>, "URI" | "Any">) => AnyF<URI>
export function makeAny<URI>(
  URI: URI
): (_: Omit<AnyF<URI>, "URI" | "Any">) => AnyF<URI> {
  return (_) => ({
    URI,
    Any: "Any",
    ..._
  })
}
