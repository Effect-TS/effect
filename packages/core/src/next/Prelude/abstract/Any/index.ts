import { pipe } from "../../../../Function"
import { CovariantF, CovariantK } from "../Covariant"
import { HasURI, HKT, HKT8, KindEx, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S, SI, SO = SI>() => HKT8<
    F,
    SI,
    SO,
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
  readonly any: <S, SI, SO = SI>() => KindEx<
    F,
    SI,
    SO,
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
): <A, S, SI, SO = SI, X = never>(
  a: A
) => KindEx<F, SI, SO, X, unknown, S, unknown, never, A>
export function succeedF<F>(
  F: AnyF<F> & CovariantF<F>
): <A, S, SI, SO = SI, X = never>(
  a: A
) => HKT8<F, SI, SO, X, unknown, S, unknown, never, A>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

export function anyF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <SI, SO, X, In, S, R, E, A>(a: A) => KindEx<F, SI, SO, X, In, S, R, E, A>
export function anyF<F>(
  F: AnyF<F> & CovariantF<F>
): <SI, SO, X, In, S, R, E, A>(a: A) => HKT8<F, SI, SO, X, In, S, R, E, A>
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
