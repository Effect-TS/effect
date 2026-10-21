import * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { DrizzleTableModel } from "./tableModel.ts"

export type {
  PasskeyCredentialInsert,
  PasskeyInvalidationInput,
  PasskeyManagementServices,
  PasskeyRegistrationServices,
  PasskeyRegistrationWriter
} from "@effect/auth-persistence/Adapter"

export type PasskeyWriteTables<
  S extends Table,
  C extends Table,
  F extends Table,
  N
> = Shared.PasskeyWriteTables<
  DrizzleTableModel<S>,
  DrizzleTableModel<C>,
  DrizzleTableModel<F>,
  N,
  SQL
>

export type PasskeyInvalidationMutation<N> = Shared.PasskeyInvalidationMutation<N, SQL>

export const passkeyInvalidationMutation = <T extends Table, N>(input: {
  readonly table: T
  readonly where: (input: Shared.PasskeyInvalidationInput<N>) => SQL
  readonly values: (
    input: Shared.PasskeyInvalidationInput<N>
  ) => Partial<DrizzleTableModel<T>["insert"]>
  readonly postcondition: (input: Shared.PasskeyInvalidationInput<N>) => SQL
}): PasskeyInvalidationMutation<N> => Shared.passkeyInvalidationMutation<DrizzleTableModel<T>, N, SQL>(input)

export type PasskeyManagementMapping<
  S extends Table,
  C extends Table,
  F extends Table,
  Flow extends Table,
  N
> = Shared.PasskeyManagementMapping<
  DrizzleTableModel<S>,
  DrizzleTableModel<C>,
  DrizzleTableModel<F>,
  DrizzleTableModel<Flow>,
  N,
  SQL
>

export type PasskeyRegistrationMapping<
  S extends Table,
  C extends Table,
  F extends Table,
  Flow extends Table,
  N,
  R
> = Shared.PasskeyRegistrationMapping<
  DrizzleTableModel<S>,
  DrizzleTableModel<C>,
  DrizzleTableModel<F>,
  DrizzleTableModel<Flow>,
  N,
  R,
  SQL
>
