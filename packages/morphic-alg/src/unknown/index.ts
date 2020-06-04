import type { URIS2, Kind2, URIS, Kind, HKT2 } from "@morphic-ts/common/lib/HKT"
import type { ConfigsForType, AnyEnv } from "@morphic-ts/common/lib/config"

import type { Record } from "@matechs/core/Record"

export type Keys = Record<string, null>

export const UnknownURI = "@matechs/core/UnknownURI" as const

export type UnknownURI = typeof UnknownURI

declare module "@morphic-ts/algebras/lib/hkt" {
  export interface Algebra<F, Env> {
    [UnknownURI]: MatechsAlgebraUnknown<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [UnknownURI]: MatechsAlgebraUnknown1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [UnknownURI]: MatechsAlgebraUnknown2<F, Env>
  }
}

export interface MatechsAlgebraUnknown<F, Env> {
  _F: F
  unknown: {
    (config?: ConfigsForType<Env, unknown, unknown>): HKT2<F, Env, unknown, unknown>
  }
}

export interface MatechsAlgebraUnknown1<F extends URIS, Env extends AnyEnv> {
  _F: F
  unknown(config?: ConfigsForType<Env, unknown, unknown>): Kind<F, Env, unknown>
}

export interface MatechsAlgebraUnknown2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  unknown(
    config?: ConfigsForType<Env, unknown, unknown>
  ): Kind2<F, Env, unknown, unknown>
}
