import type { Record } from "@effect-ts/core/Classic/Record"

import type { AnyEnv, ConfigsForType, Named } from "../config"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "../utils/hkt"

export type Keys = Record<string, null>

export const UnknownURI = "UnknownURI" as const

export type UnknownURI = typeof UnknownURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [UnknownURI]: Unknown<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [UnknownURI]: AlgebraUnknown1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [UnknownURI]: AlgebraUnknown2<F, Env>
  }
}

export interface UnknownConfig {}

export interface Unknown<F, Env> {
  _F: F
  unknown: {
    (config?: Named<ConfigsForType<Env, unknown, unknown, UnknownConfig>>): HKT2<
      F,
      Env,
      unknown,
      unknown
    >
  }
}

export interface AlgebraUnknown1<F extends URIS, Env extends AnyEnv> {
  _F: F
  unknown(
    config?: Named<ConfigsForType<Env, unknown, unknown, UnknownConfig>>
  ): Kind<F, Env, unknown>
}

export interface AlgebraUnknown2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  unknown(
    config?: Named<ConfigsForType<Env, unknown, unknown, UnknownConfig>>
  ): Kind2<F, Env, unknown, unknown>
}
