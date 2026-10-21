import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { AuthCredentialCommand } from "../operations/credentials.ts"
import { AuthRevealCommand } from "../operations/reveals.ts"
import { credentialSlots } from "./models.ts"

/** @internal */
export const CredentialWire = Schema.Union([
  Schema.TaggedStruct("Clear", {}),
  Schema.TaggedStruct("Issue", {
    credential: Schema.NonEmptyString.check(Schema.isMaxLength(16384)),
    expiresAtMillis: Schema.Int
  })
])

/** @internal */
export const RevealWire = Schema.Struct({
  kind: Schema.Literals(["totp-enrollment", "recovery-codes"]),
  revealId: Schema.NonEmptyString,
  expiresAtMillis: Schema.Int,
  payload: Schema.Json
})

/** @internal */
export const credentialWire = (command: AuthCredentialCommand) =>
  command._tag === "Clear"
    ? { _tag: "Clear" as const }
    : {
      _tag: "Issue" as const,
      credential: Redacted.value(command.credential),
      expiresAtMillis: command.expiresAtMillis
    }

/** @internal */
export const revealWire = (command: AuthRevealCommand): typeof RevealWire.Type => ({
  kind: command.kind,
  revealId: command.revealId,
  expiresAtMillis: command.expiresAtMillis,
  payload: command.kind === "totp-enrollment"
    ? { ...Redacted.value(command.payload) }
    : [...Redacted.value(command.payload)]
})

/** @internal */
export const decodeRevealWire = (value: typeof RevealWire.Type): AuthRevealCommand => {
  // oxlint-disable-next-line no-restricted-properties -- raw private transport payload is validated before constructing the redacted boundary.
  return Schema.decodeUnknownSync(AuthRevealCommand)({
    ...value,
    payload: Redacted.make(value.payload)
  })
}

/** @internal */
export { credentialSlots }
