import * as S from "../../Effect"
import { Applicative3 } from "../Applicative"
import { Contravariant3 } from "../Contravariant"
import { Covariant3 } from "../Covariant"

export const ContravariantURI = "ContravariantAsync"
export type ContravariantURI = typeof ContravariantURI

export const CovariantURI = "CovariantAsync"
export type CovariantURI = typeof CovariantURI

export const ApplicativeURI = "ApplicativeAsync"
export type ApplicativeURI = typeof ApplicativeURI

declare module "../HKT" {
  interface URItoKind3<R, E, A> {
    [ContravariantURI]: S.AsyncRE<A, E, R>
    [CovariantURI]: S.AsyncRE<R, E, A>
    [ApplicativeURI]: S.AsyncRE<R, E, A>
  }
}

export const Contravariant: Contravariant3<ContravariantURI> = {
  URI: ContravariantURI,
  contramap: S.provideSome
}

export const Covariant: Covariant3<CovariantURI> = {
  URI: CovariantURI,
  map: S.map
}

export const Applicative: Applicative3<ApplicativeURI> = {
  URI: ApplicativeURI,
  any: () => S.of,
  both: S.zip,
  map: S.map
}

export const ApplicativePar: Applicative3<ApplicativeURI> = {
  URI: ApplicativeURI,
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
