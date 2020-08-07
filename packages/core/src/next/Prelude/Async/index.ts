import * as S from "../../Effect"
import { Applicative3 } from "../abstract/Applicative"
import { AssociativeBoth3 } from "../abstract/AssociativeBoth"
import { AssociativeEither3 } from "../abstract/AssociativeEither"
import { Contravariant3 } from "../abstract/Contravariant"
import { Covariant3 } from "../abstract/Covariant"
import { Foreachable3 } from "../abstract/Foreachable"
import { Monad3 } from "../abstract/Monad"

export const AsyncEnvURI = "AsyncEnv"
export type AsyncEnvURI = typeof AsyncEnvURI

export const AsyncURI = "Async"
export type AsyncURI = typeof AsyncURI

declare module "../abstract/HKT" {
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

export const AssociativeBoth: AssociativeBoth3<AsyncURI> = {
  URI: AsyncURI,
  both: (fb) => (fa) => S.zip_(fa, fb)
}

export const AssociativeBothPar: AssociativeBoth3<AsyncURI> = {
  URI: AsyncURI,
  both: (fb) => (fa) => S.zipPar_(fa, fb)
}

export const Applicative: Applicative3<AsyncURI> = {
  URI: AsyncURI,
  any: () => S.of,
  both: AssociativeBoth.both,
  map: S.map
}

export const ApplicativePar: Applicative3<AsyncURI> = {
  URI: AsyncURI,
  any: () => S.of,
  both: AssociativeBothPar.both,
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

export function ForeachableParN(n: number): Foreachable3<AsyncURI> {
  return {
    URI: AsyncURI,
    map: S.map,
    foreach: S.foreachParN(n)
  }
}

export const Monad: Monad3<AsyncURI> = {
  URI: AsyncURI,
  any: () => S.of,
  flatten: S.flatten,
  map: S.map
}

/**
 * @category api
 */

export function cast<S, R, E, A>(effect: S.Effect<S, R, E, A>): S.AsyncRE<R, E, A> {
  return effect
}
