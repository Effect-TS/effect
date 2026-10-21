/**
 * Transport contracts for TOTP enrollment, verification, and recovery.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Schema from "effect/Schema"

import { makeOperation, operationGroup } from "./internal/operations/operation.ts"
import { TotpFailure } from "./internal/totp/errors.ts"
import {
  TotpCode,
  TotpCredential,
  TotpEnrollmentStarted,
  TotpId,
  TotpManagementResult,
  TotpRecoveryCode,
  TotpRecoveryRegenerated,
  TotpRecoveryReset
} from "./internal/totp/models.ts"

/**
 * Common command and action proof fields for TOTP management.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const actionFields = { commandId: TotpId, actionProof: Schema.optionalKey(TotpCredential) }

/**
 * Schema for beginning TOTP enrollment with an account name.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const BeginInput = Schema.Struct({
  ...actionFields,
  accountName: Schema.NonEmptyString.check(Schema.isMaxLength(128))
})

/**
 * Schema for confirming TOTP enrollment with a one-time code.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const ConfirmInput = Schema.Struct({
  ...actionFields,
  enrollmentId: TotpId,
  code: TotpCode
})

/**
 * Schema for TOTP management commands.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const ManageInput = Schema.Struct(actionFields)
/**
 * Schema for verifying pending authentication with a TOTP code.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const VerifyInput = Schema.Struct({ pendingCredential: TotpCredential, code: TotpCode })

/**
 * Schema for recovering pending authentication with a recovery code.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const RecoveryInput = Schema.Struct({
  pendingCredential: TotpCredential,
  code: TotpRecoveryCode
})

/**
 * Schema for verifying step-up authentication with a TOTP code.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const StepUpInput = Schema.Struct({
  stepUpCredential: TotpCredential,
  sourceCredential: TotpCredential,
  code: TotpCode
})

/**
 * Creates TOTP enrollment, verification, and recovery operation contracts.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = <
  const Id extends string,
  Session extends Schema.Codec<unknown, unknown, unknown, unknown>,
  Completion extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  sessions: { readonly Session: Session; readonly CompletionResult: Completion }
) => {
  const Begin = makeOperation(`${moduleId}/totp/enroll`, {
    payload: BeginInput,
    success: TotpEnrollmentStarted,
    error: TotpFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use",
    credentials: true,
    reveals: ["totp-enrollment"]
  })

  const Confirm = makeOperation(`${moduleId}/totp/confirm`, {
    payload: ConfirmInput,
    success: TotpManagementResult,
    error: TotpFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use",
    credentials: true,
    reveals: ["recovery-codes"]
  })

  const Disable = makeOperation(`${moduleId}/totp/disable`, {
    payload: ManageInput,
    success: TotpManagementResult,
    error: TotpFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use"
  })

  const Regenerate = makeOperation(`${moduleId}/totp/recovery/regenerate`, {
    payload: ManageInput,
    success: TotpRecoveryRegenerated,
    error: TotpFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use",
    credentials: true,
    reveals: ["recovery-codes"]
  })

  const VerifyPending = makeOperation(`${moduleId}/totp/pending`, {
    payload: VerifyInput,
    success: sessions.CompletionResult,
    error: TotpFailure,
    exposure: "public",
    access: "any",
    replay: "single-use",
    credentials: true
  })

  const VerifyStepUp = makeOperation(`${moduleId}/totp/step-up`, {
    payload: StepUpInput,
    success: sessions.Session,
    error: TotpFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use",
    credentials: true
  })

  const RecoverPending = makeOperation(`${moduleId}/totp/recovery/pending`, {
    payload: RecoveryInput,
    success: sessions.CompletionResult,
    error: TotpFailure,
    exposure: "public",
    access: "any",
    replay: "single-use",
    credentials: true
  })

  const RecoverLostFactor = makeOperation(`${moduleId}/totp/recovery/reset`, {
    payload: RecoveryInput,
    success: TotpRecoveryReset,
    error: TotpFailure,
    exposure: "public",
    access: "any",
    replay: "single-use",
    credentials: true
  })

  const operations = {
    Begin,
    Confirm,
    Disable,
    Regenerate,
    VerifyPending,
    VerifyStepUp,
    RecoverPending,
    RecoverLostFactor
  }

  return Object.freeze({ operations, group: operationGroup(...Object.values(operations)) })
}

export {
  /**
   * Schema for TOTP enrollment lifetime, clock skew, attempt limits, evidence age, and recovery policy.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpPolicy
} from "./internal/totp/models.ts"
