import { Kind, URIS } from "fp-ts/lib/HKT"

import * as EF from "../effect"

export interface FunctorM<T extends URIS, S, R, E> {
  <A, B>(ta: Kind<T, A>, f: (a: A) => EF.Effect<S, R, E, B>): EF.Effect<
    S,
    R,
    E,
    Kind<T, B>
  >
}

export function functorM<URI extends URIS, S = never, R = unknown, E = never>() {
  return (f: FunctorM<URI, S, R, E>): FunctorM<URI, S, R, E> => f
}
