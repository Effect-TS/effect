import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { Email, SubjectId } from "../../../Schema.ts"
import { TokenDigest } from "../../../Schema.ts"
import { hasCommitScope, type PreparedCommit } from "../../hooks/commit.ts"
import { HookDenied } from "../../hooks/models.ts"
import { LoginIdentifier } from "../../identity/models.ts"
import { ProofCapabilityUnsupported, ProofIngressDenied, ProofInvalid } from "../../proofs/errors.ts"
import { AuthenticationAuthority } from "../../sessions/authenticationAuthority.ts"
import {
  PendingAuthenticationInvalid,
  SessionCapabilityUnsupported,
  SessionConflict,
  SessionInvalid,
  StaleAuthentication
} from "../../sessions/errors.ts"
import type { AuthenticationEvidence, AuthenticationFlowId } from "../../sessions/models.ts"
import { markAuthFailureReported, reportAuthFailure } from "../../shared/diagnostics.ts"
import { PasswordHashingUnavailable, PasswordKdfBusy } from "../errors.ts"
import { PasswordHashing } from "../passwordHashing.ts"
import { PasswordMethodUnsupported, PasswordRejected, PasswordUnavailable } from "./errors.ts"
import type { PasswordCredentialSnapshot } from "./models.ts"
import { PasswordAttemptLimiter } from "./passwordAttemptLimiter.ts"
import { PasswordPersistence } from "./passwordPersistence.ts"
import type { PasswordMethodPolicy } from "./policy.ts"
import { snapshotPasswordCredential, snapshotPasswordRequirement, snapshotPasswordRevision } from "./snapshot.ts"

/** @internal */
export const passwordNoAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* PasswordMethodUnsupported.make({})
})

/** @internal */
export const readPasswordCommit = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
  )

/**
 * A commit acknowledgment can be lost after the session is durable. Only
 * definite policy/credential rejection may become PasswordRejected.
 *
 * @internal
 */
export const passwordCompletionFailure = (
  error: unknown
): PasswordRejected | PasswordUnavailable | PasswordMethodUnsupported | HookDenied => {
  if (Schema.is(HookDenied)(error)) return error
  if (Schema.is(Schema.Union([SessionCapabilityUnsupported, ProofCapabilityUnsupported]))(error)) {
    return PasswordMethodUnsupported.make({})
  }
  if (
    Schema.is(
      Schema.Union([
        ProofInvalid,
        ProofIngressDenied,
        SessionInvalid,
        SessionConflict,
        PendingAuthenticationInvalid,
        StaleAuthentication
      ])
    )(error)
  ) {
    return PasswordRejected.make({})
  }

  return PasswordUnavailable.make({})
}

const noAmbient = passwordNoAmbient

/** @internal */
export const passwordUnexpected = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({}))))
  )

const unexpected = passwordUnexpected

const hashingInfrastructureFailure = Schema.is(
  Schema.Union([PasswordHashingUnavailable, PasswordKdfBusy])
)

/**
 * Report infrastructure failures before the password port projects their typed errors.
 *
 * @internal
 */
export const passwordHashingDiagnostics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchCause((cause) =>
      reportAuthFailure(
        "password-hashing",
        Cause.fromReasons(
          cause.reasons.filter(
            (reason) => !Cause.isFailReason(reason) || hashingInfrastructureFailure(reason.error)
          )
        )
      ).pipe(Effect.andThen(Effect.failCause(markAuthFailureReported(cause))))
    )
  )

/** Denied attempts may consume ordinary dummy-work failures, never defects or cancellation. */
const recoverDummy = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchCause((cause) =>
      Cause.hasDies(cause) || Cause.hasInterrupts(cause)
        ? Effect.failCause(Cause.map(cause, () => PasswordUnavailable.make({})))
        : Effect.void
    )
  )

/**
 * Rate limits precede verification; the committing operation rechecks authority.
 *
 * @internal
 */
export const makePasswordVerification = ({
  moduleId,
  policy
}: {
  readonly moduleId: string
  readonly policy: PasswordMethodPolicy
}) => {
  const encoder = new TextEncoder()
  const tuple = Schema.fromJsonString(Schema.Array(Schema.String))

  const digest = Effect.fnUntraced(function*(parts: ReadonlyArray<string>) {
    const digestService = yield* Digest.Digest

    const bytes = yield* unexpected(
      digestService.digest(Digest.sha256, encoder.encode(Schema.encodeSync(tuple)(parts)))
    )

    return TokenDigest.make(Base64Url.encode(bytes))
  })

  const identifier = (email: Email) => LoginIdentifier.make({ namespace: "email", value: email })

  const sameCredential = (
    credential: PasswordCredentialSnapshot,
    revision: AuthenticationEvidence["revision"]
  ) =>
    credential.moduleId === moduleId &&
    credential.revision.subjectId === revision.subjectId &&
    credential.revision.securityRevision === revision.securityRevision &&
    new Set(credential.revision.credentials.map((item) => item.credentialId)).size ===
      credential.revision.credentials.length &&
    new Set(revision.credentials.map((item) => item.credentialId)).size ===
      revision.credentials.length &&
    credential.revision.credentials.length === revision.credentials.length &&
    credential.revision.credentials.every((expected) =>
      revision.credentials.some(
        (current) => current.credentialId === expected.credentialId && current.revision === expected.revision
      )
    ) &&
    revision.credentials.some(
      (item) =>
        item.credentialId === credential.credentialId &&
        item.revision === credential.credentialRevision
    )

  const checkedPassword = Effect.fnUntraced(
    function*(password: Redacted.Redacted<string>, credential: PasswordCredentialSnapshot) {
      const raw = Redacted.value(password)

      yield* Schema.decodeEffect(Schema.String.check(Schema.isMaxLength(65536)))(raw)
      if (credential.normalization === "none") return password
      yield* Schema.decodeEffect(Schema.String.check(Schema.isPattern(/^[^\uD800-\uDFFF]*$/u)))(
        raw
      )

      return Redacted.make(raw.normalize("NFC"))
    },
    Effect.mapError(() => PasswordRejected.make({}))
  )

  const verifyPassword = Effect.fn("Passwords.verifyPassword")(function*(
    request: {
      readonly flowId: AuthenticationFlowId
      readonly email: Email
      readonly password: Redacted.Redacted<string>
    },
    action: "sign-in" | "change",
    subjectId?: SubjectId
  ) {
    yield* noAmbient()
    const store = yield* PasswordPersistence
    const hasher = yield* PasswordHashing
    const authority = yield* AuthenticationAuthority
    const limiter = yield* PasswordAttemptLimiter

    const admitted = yield* Effect.gen(function*() {
      yield* limiter.check({
        moduleId,
        action,
        scope: "action",
        key: action,
        budget: policy.attempts.action
      })
      yield* limiter.check({
        moduleId,
        action,
        scope: "identifier",
        key: JSON.stringify(["email", request.email]),
        budget: policy.attempts.identifier
      })

      const candidate = yield* store.findCredential({
        moduleId,
        identifier: identifier(request.email),
        ...(subjectId === undefined ? {} : { subjectId })
      })

      if (Option.isSome(candidate)) {
        yield* limiter.check({
          moduleId,
          action,
          scope: "subject",
          key: candidate.value.revision.subjectId,
          budget: policy.attempts.subject
        })
      }

      return candidate
    }).pipe(
      Effect.catchCause((cause) =>
        cause.reasons.every(
            (reason) => Cause.isFailReason(reason) && reason.error._tag === "PasswordRejected"
          )
          ? Effect.succeed(undefined)
          : Effect.failCause(cause)
      )
    )

    // All denied branches do one bounded dummy attempt too. Local admission can
    // reject it; no claim of exact network timing is made.
    if (admitted === undefined) {
      yield* hasher.dummy(request.password).pipe(passwordHashingDiagnostics, recoverDummy)

      return yield* PasswordRejected.make({})
    }

    const candidate = Option.isNone(admitted)
      ? undefined
      : yield* snapshotPasswordCredential(admitted.value)

    return yield* Effect.gen(function*() {
      if (candidate === undefined) {
        yield* hasher.dummy(request.password).pipe(passwordHashingDiagnostics)

        return yield* PasswordRejected.make({})
      }

      const capture = yield* authority.capture(
        candidate.revision.subjectId,
        candidate.revision.credentials.map((item) => item.credentialId)
      )

      // Preserve the lookup's full authority vector; policy capture must confirm
      // it unchanged rather than replacing it with a selected or newer vector.
      const original = snapshotPasswordRevision(candidate.revision)
      const requirement = yield* snapshotPasswordRequirement(capture.requirement)

      if (
        !sameCredential(candidate, capture.revision) ||
        (subjectId !== undefined && candidate.revision.subjectId !== subjectId) ||
        candidate.identifier.value !== request.email
      ) {
        yield* hasher.dummy(request.password).pipe(passwordHashingDiagnostics)

        return yield* PasswordRejected.make({})
      }
      const normalized = yield* checkedPassword(request.password, candidate).pipe(Effect.result)

      if (normalized._tag === "Failure") {
        yield* hasher.dummy(request.password).pipe(passwordHashingDiagnostics, recoverDummy)

        return yield* PasswordRejected.make({})
      }
      const password = normalized.success

      const verified = yield* hasher.verify(password, candidate.verifier).pipe(
        passwordHashingDiagnostics,
        Effect.catchCause((cause) =>
          cause.reasons.every(
              (reason) => Cause.isFailReason(reason) && reason.error._tag === "PasswordVerifierInvalid"
            )
            ? hasher
              .dummy(password)
              .pipe(
                passwordHashingDiagnostics,
                Effect.andThen(Effect.fail(PasswordRejected.make({})))
              )
            : Effect.failCause(
              Cause.map(cause, (error) => error._tag === "PasswordVerifierInvalid" ? PasswordRejected.make({}) : error)
            )
        )
      )

      if (!verified.matches) return yield* PasswordRejected.make({})
      const verifiedAt = yield* DateTime.now

      if (action === "sign-in" && verified.needsRehash) {
        yield* store.rehashIfCurrent({
          credential: candidate,
          nextVerifier: yield* hasher.hash(password).pipe(passwordHashingDiagnostics)
        })
      }

      const evidence: AuthenticationEvidence = {
        revision: original,
        flowId: request.flowId,
        bindingDigest: yield* digest([
          "effect-auth/password-login/v1",
          moduleId,
          request.flowId,
          request.email
        ]),
        proofs: [
          {
            method: "password",
            credentialId: candidate.credentialId,
            factors: ["knowledge"],
            userVerified: false,
            phishingResistant: false,
            verifiedAt
          }
        ]
      }

      return { credential: candidate, evidence, requirement }
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, (error) =>
            error._tag === "PasswordRejected" ||
              error._tag === "PasswordInputInvalid" ||
              error._tag === "StaleAuthentication"
              ? PasswordRejected.make({})
              : PasswordUnavailable.make({}))
        )
      )
    )
  })

  return { digest, identifier, verifyPassword }
}
