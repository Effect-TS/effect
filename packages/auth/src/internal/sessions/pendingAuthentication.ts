import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import type { PreparedCommit } from "../hooks/commit.ts"
import type { PrepareSessionCommit } from "./commit.ts"
import {
  PendingAuthenticationInvalid,
  type SessionConflict,
  type SessionUnavailable,
  type StaleAuthentication
} from "./errors.ts"
import {
  type AuthenticationEvidence,
  AuthenticationFlowId,
  type AuthenticationRequirement,
  AuthenticationRevision,
  type SecurityRevision
} from "./models.ts"

export interface PendingAuthenticationState {
  readonly digest: TokenDigest
  readonly version: SecurityRevision
  readonly evidence: AuthenticationEvidence
  readonly expiresAt: DateTime.Utc
  readonly attemptLimit: number
}

export interface PendingAuthenticationRecord<Claims> extends PendingAuthenticationState {
  readonly claims: Claims
}

/** Detached trusted snapshot from the single authoritative Login-kind read. */
export interface PendingAuthenticationSnapshot<Claims> {
  readonly record: PendingAuthenticationRecord<Claims>
  readonly requirement: AuthenticationRequirement
}

/** Internal correlation for an independently verified additional factor. This is
 * neither a session nor reusable authorization; final completion rechecks it. */
export const PendingAuthenticationContext = Schema.Struct({
  digest: TokenDigest,
  flowId: AuthenticationFlowId,
  bindingDigest: TokenDigest,
  revision: AuthenticationRevision,
  expiresAtMillis: Schema.Int
})

export type PendingAuthenticationContext = typeof PendingAuthenticationContext.Type

const decodePendingAuthenticationContext = Schema.decodeEffect(PendingAuthenticationContext)

/** Detaches the entire graph and projects away storage/private fields. */
export const snapshotPendingAuthenticationContext = Effect.fnUntraced(function*(input: PendingAuthenticationContext) {
  const value = yield* decodePendingAuthenticationContext(input).pipe(
    Effect.mapError(() => PendingAuthenticationInvalid.make({}))
  )

  // A decoder that returns its input unchanged still needs the copy:
  // the caller's object must stay unfrozen.
  if (value !== input) {
    for (const credential of value.revision.credentials) {
      Object.freeze(credential)
    }
    Object.freeze(value.revision.credentials)
    Object.freeze(value.revision)

    return Object.freeze(value)
  }

  return Object.freeze({
    digest: value.digest,
    flowId: value.flowId,
    bindingDigest: value.bindingDigest,
    expiresAtMillis: value.expiresAtMillis,
    revision: Object.freeze({
      subjectId: value.revision.subjectId,
      securityRevision: value.revision.securityRevision,
      credentials: Object.freeze(
        value.revision.credentials.map((item) =>
          Object.freeze({
            credentialId: item.credentialId,
            revision: item.revision
          })
        )
      )
    })
  })
})

export const pendingAuthenticationContext = (record: PendingAuthenticationState) =>
  snapshotPendingAuthenticationContext({
    digest: record.digest,
    flowId: record.evidence.flowId,
    bindingDigest: record.evidence.bindingDigest,
    revision: record.evidence.revision,
    expiresAtMillis: DateTime.toEpochMillis(record.expiresAt)
  })

/** Optional MFA persistence; minimal single-factor sessions do not require this capability. */
export interface PendingAuthentication<Claims> {
  /** Conditional on active subject and original revisions, unique by digest.
   * Conflicts fail SessionConflict; discard any speculative losing receipt and
   * events. Never pair an existing record with this attempt's generated secret.
   * The authentication method owns single use of its proof before this call.
   */
  readonly create: <A>(
    input: Omit<PendingAuthenticationRecord<Claims>, "version">,
    now: DateTime.Utc,
    prepare: PrepareSessionCommit<PendingAuthenticationRecord<Claims>, A>
  ) => Effect.Effect<PreparedCommit<A>, StaleAuthentication | SessionConflict | SessionUnavailable>
  /** Authoritative Login-kind expiry, revision, consumed-status and budget checks.
   * Return current requirement from that same read. Final completion still rechecks. */
  readonly read: (input: {
    readonly digest: TokenDigest
    readonly now: DateTime.Utc
  }) => Effect.Effect<
    PendingAuthenticationSnapshot<Claims>,
    PendingAuthenticationInvalid | SessionUnavailable
  >
  /** Prepare a rejection VALUE; translate it to a public failure only after the root
   * receipt commits, so outer rollback/error translation cannot erase attempts. */
  readonly reject: <A>(
    input: {
      readonly digest: TokenDigest
      readonly now: DateTime.Utc
    },
    prepare: PrepareSessionCommit<{ readonly _tag: "Rejected" }, A>
  ) => Effect.Effect<PreparedCommit<A>, SessionUnavailable>
}
