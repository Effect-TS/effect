import type * as Shared from "@effect/auth-persistence/Adapter"
import { TotpPersistence } from "@effect/auth/Totp"
import type { SQL, Table } from "drizzle-orm"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { DrizzleTableModel } from "./tableModel.ts"
export { requiredTotpConstraints, type TotpMappingSource } from "@effect/auth-persistence/Adapter"

export type TotpMapping<
  S extends Table,
  F extends Table,
  C extends Table,
  N,
  P extends Table = Table
> = Shared.TotpMapping<
  DrizzleTableModel<S>,
  DrizzleTableModel<F>,
  DrizzleTableModel<C>,
  N,
  DrizzleTableModel<P>,
  SQL
>

export interface TotpPersistenceServices {
  readonly totpPersistence: TotpPersistence["Service"]
}

export const totpPersistenceLayer = <E, R>(
  services: Effect.Effect<TotpPersistenceServices, E, R>
) =>
  Layer.effect(
    TotpPersistence,
    Effect.map(services, (value) => value.totpPersistence)
  )
