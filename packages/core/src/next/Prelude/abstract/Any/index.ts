import { pipe } from "../../../../Function"
import { CovariantK, CovariantF } from "../Covariant"
import { HasURI, HKT, HKT6, Kind, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In>() => HKT6<F, never, In, S, unknown, never, unknown>
}

export interface AnyK<F extends URIS> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In>() => Kind<F, never, In, S, unknown, never, unknown>
}

export function succeedF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <A, In, S = In>(a: A) => Kind<F, never, In, S, unknown, never, A>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A>
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
