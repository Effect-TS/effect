import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { DrizzleTableModel } from "./tableModel.ts"

export type {
  PasskeyRegistrationCeremonyCapabilities,
  PasskeyRegistrationCeremonyServices
} from "@effect/auth-persistence/Adapter"

export type PasskeyRegistrationCeremonyMapping<Flow extends Table> = Shared.PasskeyRegistrationCeremonyMapping<
  DrizzleTableModel<Flow>,
  SQL
>
