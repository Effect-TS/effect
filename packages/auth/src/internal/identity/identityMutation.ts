import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { SubjectId } from "../../Schema.ts"
import type {
  CredentialId,
  IdentityConflict,
  IdentityUnavailable,
  LastSignInMethod,
  LoginIdentifier,
  SubjectInactive
} from "./models.ts"

/**
 * Narrow removal capability. The authoritative adapter checks active status,
 * ownership and the remaining usable sign-in methods in the SAME atomic write.
 * A read/count followed by deletion is insufficient under concurrent removals.
 * Removing a credential also removes its retained secrets and dependent proofs.
 * Identifier removal/rebinding/verification changes that invalidate captured login
 * authority MUST atomically bump subject securityRevision. AuthenticationRevision
 * deliberately has no identifier-binding revision: deleting dependent proofs alone
 * cannot invalidate password evidence already captured before verification.
 */
export class IdentityMutation extends Context.Service<
  IdentityMutation,
  {
    readonly removeIdentifier: (
      subjectId: SubjectId,
      identifier: LoginIdentifier
    ) => Effect.Effect<
      void,
      IdentityConflict | LastSignInMethod | SubjectInactive | IdentityUnavailable
    >
    readonly removeCredential: (
      subjectId: SubjectId,
      credentialId: CredentialId
    ) => Effect.Effect<
      void,
      IdentityConflict | LastSignInMethod | SubjectInactive | IdentityUnavailable
    >
  }
>()("@effect/auth/IdentityMutation") {}
