import * as S from "../../Effect"
import { Applicative3 } from "../Applicative"
import { AssociativeEither3 } from "../AssociativeEither"
import { Contravariant3 } from "../Contravariant"
import { Covariant3 } from "../Covariant"
import { Foreachable3 } from "../Foreachable"

export const AsyncEnvURI = "AsyncEnv"
export type AsyncEnvURI = typeof AsyncEnvURI

export const AsyncURI = "Async"
export type AsyncURI = typeof AsyncURI

declare module "../HKT" {
  interface URItoKind3<R, E, A> {
    [AsyncEnvURI]: S.AsyncRE<A, E, R>
    [AsyncURI]: S.AsyncRE<R, E, A>
  }
}

export const ContravariantEnv: Contravariant3<AsyncEnvURI> = {
  URI: AsyncEnvURI,
  contramap: S.provideSome
}

export const Covariant: Covariant3<AsyncURI> = {
  URI: AsyncURI,
  map: S.map
}

export const Applicative: Applicative3<AsyncURI> = {
  URI: AsyncURI,
  any: () => S.of,
  both: S.zip,
  map: S.map
}

export const ApplicativePar: Applicative3<AsyncURI> = {
  URI: AsyncURI,
  any: () => S.of,
  both: (fb) => (fa) => S.zipPar_(fa, fb),
  map: S.map
}

export const AssociativeEither: AssociativeEither3<AsyncURI> = {
  URI: AsyncURI,
  either: S.orElseEither
}

export const Foreachable: Foreachable3<AsyncURI> = {
  URI: AsyncURI,
  map: S.map,
  foreach: S.foreach
}

export const ForeachablePar: Foreachable3<AsyncURI> = {
  URI: AsyncURI,
  map: S.map,
  foreach: S.foreachPar
}

export function ForeachableParN(n: number) {
  return {
    URI: AsyncURI,
    map: S.map,
    foreach: S.foreachParN(n)
  }
}
