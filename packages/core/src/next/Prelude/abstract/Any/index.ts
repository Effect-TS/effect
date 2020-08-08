import { pipe } from "../../../../Function"
import { CovariantK, CovariantF } from "../Covariant"
import { HasURI, HKT, HKT6, Kind, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In, X = never, R = unknown, E = never>() => HKT6<
    F,
    X,
    In,
    S,
    R,
    E,
    unknown
  >
}

export interface AnyK<F extends URIS> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In, X = never, R = unknown, E = never>() => Kind<
    F,
    X,
    In,
    S,
    R,
    E,
    unknown
  >
}

export function succeedF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <A, In, S = In, X = never, R = unknown, E = never>(
  a: A
) => Kind<F, X, In, S, R, E, A>
export function succeedF<F>(
  F: AnyF<F> & CovariantF<F>
): <A, In, S = In, X = never, R = unknown, E = never>(
  a: A
) => HKT6<F, X, In, S, R, E, A>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

export function makeAny<URI extends URIS>(
  _: URI
): (_: Omit<AnyK<URI>, "URI" | "Any">) => AnyK<URI>
export function makeAny<URI>(
  URI: URI
): (_: Omit<AnyF<URI>, "URI" | "Any">) => AnyF<URI> {
  return (_) => ({
    URI,
    Any: "Any",
    ..._
  })
}
