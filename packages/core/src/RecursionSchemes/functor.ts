import { Kind, URIS } from "../Base"
import * as T from "../Effect"

export interface FunctorM<T extends URIS, S, R, E> {
  <A, B>(ta: Kind<T, A>, f: (a: A) => T.Effect<S, R, E, B>): T.Effect<
    S,
    R,
    E,
    Kind<T, B>
  >
}

export function functorM<URI extends URIS, S = never, R = unknown, E = never>() {
  return (f: FunctorM<URI, S, R, E>): FunctorM<URI, S, R, E> => f
}
