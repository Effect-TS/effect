import { pipe } from "../../../../Function"
import {
  Covariant1,
  Covariant2,
  Covariant3,
  Covariant4,
  Covariant5,
  Covariant6,
  CovariantF
} from "../Covariant"
import {
  HasURI,
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: () => HKT<F, unknown>
}

export interface Any1<F extends URIS> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: () => Kind<F, unknown>
}

export interface Any2<F extends URIS2> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: () => Kind2<F, never, unknown>
}

export interface Any3<F extends URIS3> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: () => Kind3<F, unknown, never, unknown>
}

export interface Any4<F extends URIS4> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <S = unknown>() => Kind4<F, S, unknown, never, unknown>
}

export interface Any5<F extends URIS5> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In>() => Kind5<F, In, S, unknown, never, unknown>
}

export interface Any6<F extends URIS6> extends HasURI<F> {
  readonly Any: "Any"
  readonly any: <In, S = In>() => Kind6<F, never, In, S, unknown, never, unknown>
}

export function succeedF<F extends URIS>(
  F: Any1<F> & Covariant1<F>
): <A>(a: A) => Kind<F, A>
export function succeedF<F extends URIS2>(
  F: Any2<F> & Covariant2<F>
): <A>(a: A) => Kind2<F, never, A>
export function succeedF<F extends URIS3>(
  F: Any3<F> & Covariant3<F>
): <A>(a: A) => Kind3<F, unknown, never, A>
export function succeedF<F extends URIS4>(
  F: Any4<F> & Covariant4<F>
): <A, S>(a: A) => Kind4<F, S, unknown, never, A>
export function succeedF<F extends URIS5>(
  F: Any5<F> & Covariant5<F>
): <A, In, S = In>(a: A) => Kind5<F, In, S, unknown, never, A>
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

export function makeAny<URI extends URIS>(
  _: URI
): (_: Omit<Any1<URI>, "URI" | "Any">) => Any1<URI>
export function makeAny<URI extends URIS2>(
  _: URI
): (_: Omit<Any2<URI>, "URI" | "Any">) => Any2<URI>
export function makeAny<URI extends URIS3>(
  _: URI
): (_: Omit<Any3<URI>, "URI" | "Any">) => Any3<URI>
export function makeAny<URI extends URIS4>(
  _: URI
): (_: Omit<Any4<URI>, "URI" | "Any">) => Any4<URI>
export function makeAny<URI extends URIS5>(
  _: URI
): (_: Omit<Any5<URI>, "URI" | "Any">) => Any5<URI>
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
