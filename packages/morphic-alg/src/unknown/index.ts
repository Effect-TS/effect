import type { ConfigsForType, AnyEnv } from "../config"
import type { URIS2, Kind2, URIS, Kind, HKT2 } from "../utils/hkt"

import type { Record } from "@matechs/core/Record"

export type Keys = Record<string, null>

export const UnknownURI = "@matechs/morphic-alg/UnknownURI" as const

export type UnknownURI = typeof UnknownURI

declare module "../utils/hkt" {
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

export interface UnknownConfig {}

export interface MatechsAlgebraUnknown<F, Env> {
  _F: F
  unknown: {
    (config?: {
      name?: string
      conf?: ConfigsForType<Env, unknown, unknown, UnknownConfig>
    }): HKT2<F, Env, unknown, unknown>
  }
}

export interface MatechsAlgebraUnknown1<F extends URIS, Env extends AnyEnv> {
  _F: F
  unknown(config?: {
    name?: string
    conf?: ConfigsForType<Env, unknown, unknown, UnknownConfig>
  }): Kind<F, Env, unknown>
}

export interface MatechsAlgebraUnknown2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  unknown(config?: {
    name?: string
    conf?: ConfigsForType<Env, unknown, unknown, UnknownConfig>
  }): Kind2<F, Env, unknown, unknown>
}
