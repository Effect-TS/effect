import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { DrizzleTableModel } from "./tableModel.ts"

export {
  type D1PasskeyMapping,
  type PasskeyCredentialServices,
  passkeyCredentialsLayer,
  type PasskeyFlowInsert,
  type PasskeyMappingSource,
  passkeyPersistenceLayer,
  type PasskeyPersistenceServices,
  type PasskeySubjectIdCodec,
  requiredPasskeyCredentialConstraints,
  requiredPasskeyPersistenceConstraints
} from "@effect/auth-persistence/Adapter"

export type PasskeyColumn<T extends Table> = Shared.PasskeyColumn<DrizzleTableModel<T>>
export type PasskeyClock = Shared.PasskeyClock<SQL>

export type PasskeySubjectReadTable<T extends Table, N> = Shared.PasskeySubjectReadTable<
  DrizzleTableModel<T>,
  N,
  SQL
>

export type PasskeyFactorReadTable<T extends Table> = Shared.PasskeyFactorReadTable<
  DrizzleTableModel<T>,
  SQL
>

export type PasskeyCredentialReadTable<T extends Table, N> = Shared.PasskeyCredentialReadTable<
  DrizzleTableModel<T>,
  N,
  SQL
>

export type PasskeyCredentialMapping<
  S extends Table,
  C extends Table,
  F extends Table,
  N
> = Shared.PasskeyCredentialMapping<
  DrizzleTableModel<S>,
  DrizzleTableModel<C>,
  DrizzleTableModel<F>,
  N,
  SQL
>

export type PasskeyFlowTable<T extends Table> = Shared.PasskeyFlowTable<DrizzleTableModel<T>>

export type PasskeyCeremonyMapping<Flow extends Table> = Shared.PasskeyCeremonyMapping<
  DrizzleTableModel<Flow>,
  SQL
>

type CredentialTable<Read> = Read extends {
  readonly credential: { readonly table: infer T extends Table }
} ? T
  : never

export type PasskeyPersistenceMapping<
  Read,
  Flow extends Table,
  N
> = Shared.PasskeyPersistenceMapping<
  Read,
  DrizzleTableModel<Flow>,
  N,
  SQL,
  DrizzleTableModel<CredentialTable<Read>>
>
