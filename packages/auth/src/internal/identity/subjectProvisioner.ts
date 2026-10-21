import * as Context from "effect/Context"
import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"

import type { IdentityConflict, IdentityUnavailable, LoginIdentifier, SubjectProvisioned } from "./models.ts"

/**
 * Trusted method input after its registration proof/policy has been checked.
 * This is a service input, never a remotely exposed registration payload.
 * Omit verifiedAt for password-only registration with an unverified identifier.
 */
export type SubjectProvisioningInput =
  & { readonly requestId: string }
  & (
    | { readonly identifier?: never; readonly verifiedAt?: never }
    | { readonly identifier: LoginIdentifier; readonly verifiedAt?: DateTime.Utc }
  )

/**
 * Application authority for subject creation and initial identifier binding.
 *
 * Repeating a requestId with the same input must resolve the same subject;
 * repeating it with different input must fail. Identifier uniqueness and
 * provisioning commit together when they share an authority. Provisioning must
 * finish synchronously before this service returns. Applications whose accounts
 * live elsewhere must provision idempotently by requestId or own a separate queue.
 *
 * This port does not create a session or bind method-specific credentials. The
 * method's registration coordinator owns that atomic boundary before it can
 * issue an authenticated result.
 */
export class SubjectProvisioner extends Context.Service<
  SubjectProvisioner,
  {
    readonly provision: (
      input: SubjectProvisioningInput
    ) => Effect.Effect<SubjectProvisioned, IdentityConflict | IdentityUnavailable>
  }
>()("@effect/auth/SubjectProvisioner") {}
