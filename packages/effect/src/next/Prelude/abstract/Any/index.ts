import { pipe } from "../../../../Function"
import { Covariant6, CovariantF } from "../Covariant"
import { HasURI, HKT, Kind6, URIS6 } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: () => HKT<F, unknown>
}

export interface Any6<F extends URIS6> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In>() => Kind6<F, never, In, S, unknown, never, unknown>
}

export function succeedF<F extends URIS6>(
  F: Any6<F> & Covariant6<F>
): <A, In, S = In>(a: A) => Kind6<F, never, In, S, unknown, never, A>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

export function makeAny<URI extends URIS6>(
  _: URI
): (_: Omit<Any6<URI>, "URI" | "Any">) => Any6<URI>
export function makeAny<URI>(
  URI: URI
): (_: Omit<AnyF<URI>, "URI" | "Any">) => AnyF<URI> {
  return (_) => ({
    URI,
    Any: "Any",
    ..._
  })
}
