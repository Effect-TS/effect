import * as S from "../../Effect"
import { Applicative3 } from "../Applicative"
import { Contravariant3 } from "../Contravariant"
import { Covariant3 } from "../Covariant"

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

export const Contravariant: Contravariant3<AsyncEnvURI> = {
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

export const succeed: <A>(a: A) => S.AsyncRE<unknown, never, A> = S.succeed

export const chain: <R1, E1, A1, A>(
  f: (a: A) => S.AsyncRE<R1, E1, A1>
) => <R, E>(val: S.AsyncRE<R, E, A>) => S.AsyncRE<R & R1, E1 | E, A1> = S.chain

export const effectTotal: <A>(effect: () => A) => S.AsyncRE<unknown, never, A> =
  S.effectTotal

export const runMain: <E>(effect: S.AsyncRE<S.DefaultEnv, E, void>) => S.CancelMain =
  S.runMain
