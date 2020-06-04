import type { URIS2, Kind2, URIS, Kind, HKT2 } from "@morphic-ts/common/lib/HKT"
import type { ConfigsForType, AnyEnv } from "@morphic-ts/common/lib/config"

import type { Newtype } from "@matechs/core/Newtype"

export const NewtypeURI = "@matechs/morphic/NewtypeURI" as const

export type NewtypeURI = typeof NewtypeURI

declare module "@morphic-ts/algebras/lib/hkt" {
  export interface Algebra<F, Env> {
    [NewtypeURI]: MatechsAlgebraNewtype<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [NewtypeURI]: MatechsAlgebraNewtype1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [NewtypeURI]: MatechsAlgebraNewtype2<F, Env>
  }
}

export type AnyNewtype = Newtype<any, any>

export type NewtypeA<N extends AnyNewtype> = N extends Newtype<any, infer A> ? A : never

export interface MatechsAlgebraNewtype<F, Env> {
  _F: F
  newtype: <N extends AnyNewtype = never>(
    name: string
  ) => {
    <E>(a: HKT2<F, Env, E, NewtypeA<N>>, config?: ConfigsForType<Env, E, N>): HKT2<
      F,
      Env,
      E,
      N
    >
  }
}

export interface MatechsAlgebraNewtype1<F extends URIS, Env> {
  _F: F
  newtype<N extends AnyNewtype = never>(
    name: string
  ): (a: Kind<F, Env, N>, config?: ConfigsForType<Env, unknown, N>) => Kind<F, Env, N>
}

export interface MatechsAlgebraNewtype2<F extends URIS2, Env> {
  _F: F
  newtype<N extends AnyNewtype = never>(
    name: string
  ): <E>(
    a: Kind2<F, Env, E, N>,
    config?: ConfigsForType<Env, E, N>
  ) => Kind2<F, Env, E, N>
}
