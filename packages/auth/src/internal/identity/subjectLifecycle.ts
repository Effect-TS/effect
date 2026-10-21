import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { SubjectId } from "../../Schema.ts"
import type { IdentityUnavailable } from "./models.ts"

/** Application-owned cleanup reference; never an authentication capability. */
export const SubjectCleanupReference = Schema.NonEmptyString.pipe(
  Schema.brand("effect-auth/SubjectCleanupReference")
)

export class InvalidationUnsupported extends Schema.TaggedError<InvalidationUnsupported>()(
  "InvalidationUnsupported",
  {}
) {}

/** No issued bearer remains valid for this subject after the commit. */
export class ImmediatelyInvalidated extends Schema.TaggedClass<ImmediatelyInvalidated>()(
  "ImmediatelyInvalidated",
  {}
) {}

/**
 * Pure stateless verification may accept old tokens until this instant. The
 * adapter must prevent fresh primary authentication. Any stateless renewal of
 * an existing token must remain bounded by this same instant, not extend it.
 */
export class ExpiresBy extends Schema.TaggedClass<ExpiresBy>()("ExpiresBy", {
  instant: Schema.DateTimeUtcFromMillis
}) {}

export const SubjectInvalidation = Schema.Union([ImmediatelyInvalidated, ExpiresBy])

export class SubjectCleanupComplete extends Schema.TaggedClass<SubjectCleanupComplete>()(
  "SubjectCleanupComplete",
  { subjectId: SubjectId, invalidation: SubjectInvalidation }
) {}

/**
 * The account is already blocked from new auth, but retained material in another
 * authority still needs cleanup. The consumer retries using recoveryReference.
 */
export class SubjectCleanupPending extends Schema.TaggedClass<SubjectCleanupPending>()(
  "SubjectCleanupPending",
  {
    subjectId: SubjectId,
    invalidation: SubjectInvalidation,
    recoveryReference: SubjectCleanupReference
  }
) {}

export const SubjectCleanupResult = Schema.Union([SubjectCleanupComplete, SubjectCleanupPending])

export interface SubjectTerminationInput {
  readonly subjectId: SubjectId
  readonly requestId: string
  readonly invalidation: "immediate" | "allow-expiry"
}

/**
 * Consumer-selected coordination of account disable/delete, credential and
 * proof cleanup, external token cleanup, and the session strategy's invalidation.
 * Workspace membership, profile and billing data remain application-owned.
 *
 * Operations are idempotent by requestId. Validate requested invalidation before
 * writes; a stateless composition must reject `immediate` unless the consumer
 * provides state-assisted validity. No implementation may return Complete while
 * enabled credential/proof/token stores still permit future authentication.
 */
export class SubjectLifecycle extends Context.Service<
  SubjectLifecycle,
  {
    readonly disable: (
      input: SubjectTerminationInput
    ) => Effect.Effect<
      typeof SubjectCleanupResult.Type,
      InvalidationUnsupported | IdentityUnavailable
    >
    readonly delete: (
      input: SubjectTerminationInput
    ) => Effect.Effect<
      typeof SubjectCleanupResult.Type,
      InvalidationUnsupported | IdentityUnavailable
    >
  }
>()("@effect/auth/SubjectLifecycle") {}
