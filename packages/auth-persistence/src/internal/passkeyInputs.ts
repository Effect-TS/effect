import * as Passkey from "@effect/auth/Passkey"
import { CleanupLimit } from "@effect/auth/Persistence"
import { SubjectId } from "@effect/auth/Schema"
import { SessionInvalidationWindow } from "@effect/auth/Sessions"
import * as Schema from "effect/Schema"
const metadata = { moduleId: Passkey.PasskeyModuleId, subjectId: SubjectId }

const identity = {
  ...metadata,
  commandId: Passkey.PasskeyCommandId,
  credentialId: Passkey.PasskeyCredentialId
}

/** @internal */
export const passkeyOperationInputs = {
  issue: Schema.Struct({ ceremony: Passkey.PasskeyCeremony }),
  context: Passkey.PasskeyAccess,
  consume: Schema.Struct({
    access: Passkey.PasskeyAccess,
    ceremony: Passkey.PasskeyCeremony,
    credential: Passkey.PasskeyCredential,
    assertion: Passkey.PasskeyAssertionVerified
  }),
  cleanup: Schema.Struct({
    moduleId: Passkey.PasskeyModuleId,
    limit: CleanupLimit
  }),
  lookup: Schema.Struct({
    rpId: Passkey.PasskeyProfile.fields.rpId,
    protocolCredentialId: Passkey.PasskeyProtocolCredentialId
  }),
  listForSubject: Schema.Struct({ ...metadata, rpId: Passkey.PasskeyProfile.fields.rpId })
}

/** @internal */
export const passkeyManagementInputs = {
  list: Schema.Struct({
    ...metadata,
    cursor: Schema.optionalKey(Passkey.PasskeyCredentialId),
    limit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 }))
  }),
  completeEnrollment: Schema.Struct({
    access: Passkey.PasskeyAccess,
    ceremony: Passkey.PasskeyCeremony,
    verified: Passkey.PasskeyRegistrationVerified,
    management: Passkey.PasskeyManagementPolicy
  }),
  inspectRemove: Schema.Struct({ ...metadata, credentialId: Passkey.PasskeyCredentialId }),
  rename: Schema.Struct({ ...identity, name: Passkey.PasskeyLabel }),
  remove: Schema.Struct({
    moduleId: Passkey.PasskeyModuleId,
    commandId: Passkey.PasskeyCommandId,
    credential: Passkey.PasskeyCredential,
    authorization: Passkey.PasskeyActionAuthorization,
    management: Passkey.PasskeyManagementPolicy,
    invalidation: SessionInvalidationWindow
  })
}
