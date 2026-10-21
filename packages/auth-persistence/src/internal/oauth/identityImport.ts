import {
  OAuthCredentialSnapshot,
  OAuthExternalIdentity,
  OAuthModuleId,
  type OAuthUnavailable
} from "@effect/auth/OAuth"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

/** Use the exact provider key, issuer and durable subject emitted by the configured adapter. */
export const IdentityImport = Schema.Struct({
  moduleId: OAuthModuleId,
  subjectId: OAuthCredentialSnapshot.fields.revision.fields.subjectId,
  ...OAuthExternalIdentity.fields
})

export type IdentityImport = typeof IdentityImport.Type

export const ImportedIdentity = Schema.Struct({
  credentialId: OAuthCredentialSnapshot.fields.credentialId,
  credentialRevision: OAuthCredentialSnapshot.fields.credentialRevision
})

export type ImportedIdentity = typeof ImportedIdentity.Type

/** Trusted migration authority, supplied by composed persistence for OAuth sign-in.
 * Import only ownership established by the previous provider, never an email match
 * or unverified request. The subject must already exist and be active.
 *
 * Atomically creates ownership, login and shared authority and advances subject
 * securityRevision. An exact active import is idempotent and keeps its IDs and
 * revisions; another owner/module or inconsistent/inactive rows fail closed with
 * OAuthUnavailable. No provider grant, session or account is issued. A lost commit
 * acknowledgement can be retried with the same input. Each call owns its commit;
 * ambient transactions and commit scopes are rejected.
 */
export class IdentityImports extends Context.Service<
  IdentityImports,
  {
    readonly importIdentity: (
      input: IdentityImport
    ) => Effect.Effect<ImportedIdentity, OAuthUnavailable>
  }
>()("@effect/auth-persistence/OAuthPersistence/IdentityImports") {}
