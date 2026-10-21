import type * as Shared from "@effect/auth-persistence/Adapter"
import { hooksLayer } from "@effect/auth/Persistence"
import { PhonePersistence, PhoneSignInTargets } from "@effect/auth/PhoneOtp"
import type { SQL, Table } from "drizzle-orm"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { PersistenceMappingError } from "./model.ts"
import type { ProofPersistenceMapping } from "./proofModel.ts"
import type { DrizzleTableModel } from "./tableModel.ts"

export { requiredPhoneConstraints } from "@effect/auth-persistence/Adapter"
export type PhoneMappingSource<M, R = never> = M | Effect.Effect<M, PersistenceMappingError, R>

export type PhoneMapping<
  S extends Table,
  I extends Table,
  C extends Table,
  P extends Table,
  N
> =
  & Omit<
    Shared.PhoneMapping<
      DrizzleTableModel<S>,
      DrizzleTableModel<I>,
      DrizzleTableModel<C>,
      DrizzleTableModel<P>,
      N,
      SQL
    >,
    "proofs"
  >
  & { readonly proofs: ProofPersistenceMapping<P, S, N> }

/** @internal */
export type AnyPhoneMapping = PhoneMapping<Table, Table, Table, Table, unknown>

export interface PhonePersistenceServices {
  readonly phonePersistence: PhonePersistence["Service"]
  readonly phoneSignInTargets: PhoneSignInTargets["Service"]
}

/** Bundle phone storage and lookup with empty hook defaults. */
export const phonePersistenceLayer = <E, R>(
  services: Effect.Effect<PhonePersistenceServices, E, R>
) =>
  Layer.unwrap(
    Effect.map(services, (value) =>
      Layer.mergeAll(
        Layer.succeed(PhonePersistence, value.phonePersistence),
        Layer.succeed(PhoneSignInTargets, value.phoneSignInTargets)
      ))
  ).pipe(Layer.provide(hooksLayer))
