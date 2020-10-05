import type { Record } from "@effect-ts/core/Classic/Record"

import type { AnyEnv, ConfigsForType } from "../config"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "../utils/hkt"

export const RecordURI = "RecordURI" as const

export type RecordURI = typeof RecordURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [RecordURI]: AlgebraRecord<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [RecordURI]: AlgebraRecord1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [RecordURI]: AlgebraRecord2<F, Env>
  }
}

export interface RecordConfig<L, A> {}

export interface AlgebraRecord<F, Env> {
  _F: F
  record: {
    <L, A>(
      codomain: HKT2<F, Env, L, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<
          Env,
          Record<string, L>,
          Record<string, A>,
          RecordConfig<L, A>
        >
      }
    ): HKT2<F, Env, Record<string, L>, Record<string, A>>
  }
}

export interface AlgebraRecord1<F extends URIS, Env extends AnyEnv> {
  _F: F
  record: <A>(
    codomain: Kind<F, Env, A>,
    config?: {
      name?: string
      conf?: ConfigsForType<Env, unknown, Record<string, A>, RecordConfig<unknown, A>>
    }
  ) => Kind<F, Env, Record<string, A>>
}

export interface AlgebraRecord2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  record: <L, A>(
    codomain: Kind2<F, Env, L, A>,
    config?: {
      name?: string
      conf?: ConfigsForType<
        Env,
        Record<string, L>,
        Record<string, A>,
        RecordConfig<L, A>
      >
    }
  ) => Kind2<F, Env, Record<string, L>, Record<string, A>>
}
