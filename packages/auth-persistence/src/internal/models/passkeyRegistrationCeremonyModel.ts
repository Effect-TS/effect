import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PasskeyCeremonyMapping, PasskeyPersistenceServices } from "./passkeyModel.ts"

export interface PasskeyRegistrationCeremonyCapabilities {
  readonly purposes: readonly ["registration"]
  readonly issue: "registration-authority"
  readonly assertionConsumption: false
}

export interface PasskeyRegistrationCeremonyServices extends PasskeyPersistenceServices {
  readonly capabilities: PasskeyRegistrationCeremonyCapabilities
}

/** The registration authority owns insertion and consumption of the challenge. */
export type PasskeyRegistrationCeremonyMapping<
  Flow extends Table,
  Expression extends SqlExpression = SqlExpression
> = PasskeyCeremonyMapping<Flow, Expression>
