import {
  HKT2,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"

export interface EnvironmentalF<F> {
  readonly Environmental: "Environmental"
  readonly access: <E, A>(f: (r: E) => A) => HKT2<F, E, A>
}

export interface Environmental2<F extends URIS2> {
  readonly Environmental: "Environmental"
  readonly access: <E, A>(f: (r: E) => A) => Kind2<F, E, A>
}

export interface Environmental3<F extends URIS3> {
  readonly Environmental: "Environmental"
  readonly access: <R, E, A>(f: (r: R) => A) => Kind3<F, R, E, A>
}

export interface Environmental4<F extends URIS4> {
  readonly Environmental: "Environmental"
  readonly access: <S, R, E, A>(f: (r: R) => A) => Kind4<F, S, R, E, A>
}

export interface Environmental5<F extends URIS5> {
  readonly Environmental: "Environmental"
  readonly access: <X, S, R, E, A>(f: (r: R) => A) => Kind5<F, X, S, R, E, A>
}

export interface Environmental6<F extends URIS6> {
  readonly Environmental: "Environmental"
  readonly access: <Y, X, S, R, E, A>(f: (r: R) => A) => Kind6<F, Y, X, S, R, E, A>
}

export function makeEnvironmental<URI extends URIS2>(
  _: URI
): (_: Omit<Environmental2<URI>, "URI" | "Environmental">) => Environmental2<URI>
export function makeEnvironmental<URI extends URIS3>(
  _: URI
): (_: Omit<Environmental3<URI>, "URI" | "Environmental">) => Environmental3<URI>
export function makeEnvironmental<URI extends URIS4>(
  _: URI
): (_: Omit<Environmental4<URI>, "URI" | "Environmental">) => Environmental4<URI>
export function makeEnvironmental<URI extends URIS5>(
  _: URI
): (_: Omit<Environmental5<URI>, "URI" | "Environmental">) => Environmental5<URI>
export function makeEnvironmental<URI extends URIS6>(
  _: URI
): (_: Omit<Environmental6<URI>, "URI" | "Environmental">) => Environmental6<URI>
export function makeEnvironmental<URI>(
  URI: URI
): (_: Omit<EnvironmentalF<URI>, "URI" | "Environmental">) => EnvironmentalF<URI> {
  return (_) => ({
    URI,
    Environmental: "Environmental",
    ..._
  })
}
