import type { Record } from "@effect-ts/core/Record"

import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"

export const RecordURI = "RecordURI" as const

export type RecordURI = typeof RecordURI

export interface RecordConfig<L, A> {}

export interface AlgebraRecord<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  record: <L, A>(
    codomain: Kind<F, Env, L, A>,
    config?: Named<
      ConfigsForType<Env, Record<string, L>, Record<string, A>, RecordConfig<L, A>>
    >
  ) => Kind<F, Env, Record<string, L>, Record<string, A>>
}
