import type { LifecycleHooks } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import { AuthenticationFlowId } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { type MappingInput, type OAuthFeature, PersistenceConfigurationError } from "./configuration.ts"
import {
  type OAuthConnectedPolicyInput,
  requiredOAuthConnectedConstraints,
  requiredOAuthConnectedRevocationConstraints
} from "./models/oauthConnectedModel.ts"
import { requiredOAuthSignInConstraints } from "./models/oauthModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { IdentityImports } from "./oauth/identityImport.ts"
import { makeNativeOAuthConnectedServices } from "./oauth/nativeConnected.ts"
import type { OAuthNativeConnectedMapping } from "./oauth/nativeConnectedState.ts"
import { makeNativeOAuthIdentityImports } from "./oauth/nativeImport.ts"
import { makeNativeOAuthRevocationServices } from "./oauth/nativeRevocations.ts"
import { makeNativeOAuthSignInServices } from "./oauth/nativeSignIn.ts"
import type { OAuthNativeReadMapping } from "./oauth/nativeState.ts"
import { sameRevision, satisfies } from "./oauth/state.ts"
import { exactSqlText } from "./sqlChange.ts"
import { SqlBatchCommit } from "./sqlCommit.ts"
import { makeStorageClock } from "./storageClock.ts"
import { type StorageRole, storageTables } from "./storageTables.ts"

// Removed provider grants retain revocation custody for 30 days; claims may extend it.
const revocationRetentionMillis = 30 * 24 * 60 * 60 * 1000
const encodeProfile = Schema.encodeSync(Schema.fromJsonString(OAuth.OAuthConnectedProfile))
const encodePolicy = Schema.encodeSync(Schema.fromJsonString(OAuth.OAuthConnectedPolicy))

const configurationError = (reason: string) => PersistenceConfigurationError.make({ reason })

/**
 * Managed tables use the same native OAuth operations as explicit mappings.
 *
 * @internal
 */
export const makeManagedOAuth = Effect.fnUntraced(function*(
  storage: MappingInput,
  tables: NativeSqlTables,
  features: ReadonlyArray<OAuthFeature>
): Effect.fn.Return<
  Context.Context<never>,
  PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient | SqlBatchCommit
> {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const batch = yield* SqlBatchCommit

  const clock = yield* makeStorageClock(storage).pipe(
    Effect.mapError(() => configurationError("Cannot configure the OAuth storage clock"))
  )

  const mapped = Effect.fnUntraced(function*<Role extends StorageRole>(role: Role) {
    const table = storage.tables[role]

    if (table === undefined) return yield* configurationError(`Missing ${role} mapping`)

    return {
      table,
      // Storage validation owns these logical column keys.
      ...(Object.fromEntries(Object.keys(storageTables[role].columns).map((key) => [key, key])) as {
        readonly [Key in keyof (typeof storageTables)[Role]["columns"]]: Key
      })
    }
  })

  const s = storage.subjects
  const subject = tables(s.table)
  const credential = yield* mapped("oauthCredentials")
  const credentials = tables(credential.table)
  const authority = yield* mapped("credentials")
  const factors = tables(authority.table)
  const now = tables.expression(clock.engineNowMillis)
  const policies = new Map<string, OAuth.OAuthConnectedPolicy>()

  for (const feature of features) {
    if (feature.connected === undefined) continue

    const policy = yield* OAuth.snapshotOAuth(OAuth.OAuthConnectedPolicy, feature.connected).pipe(
      Effect.mapError(() => configurationError(`Invalid OAuth policy for ${feature.moduleId}`))
    )

    const previous = policies.get(feature.moduleId)

    if (previous !== undefined && encodePolicy(previous) !== encodePolicy(policy)) {
      return yield* configurationError(`Conflicting OAuth policies for ${feature.moduleId}`)
    }
    policies.set(feature.moduleId, policy)
  }

  const shared = {
    subject: {
      table: s.table,
      id: s.id,
      status: s.status,
      securityRevision: s.securityRevision,
      isActiveStatus: (value: unknown) => Object.is(value, s.activeValue),
      activeCondition: sql`${subject.column(s.status)} = ${subject.value(s.status, s.activeValue)}`,
      decodeAuthenticationRequirement: s.requirements
    },
    subjectId: { toSubject: s.toSubject, toNative: s.toNative, equals: Object.is },
    ownership: {
      ...(yield* mapped("oauthIdentities")),
      decodeSubjectId: (row: Record<string, unknown>) => row.subjectId,
      encodeInsert: () => ({})
    },
    credential: {
      ...credential,
      status: "active",
      isActiveStatus: (value: unknown) => value === true,
      activeCondition: sql`${credentials.column("active")} = ${credentials.value("active", true)}`,
      encodeInsert: () => ({ active: true }),
      removal: "delete" as const
    },
    authority: {
      ...authority,
      status: "active",
      isActiveStatus: (value: unknown) => value === true,
      activeCondition: sql`${factors.column("active")} = ${factors.value("active", true)}`,
      encodeInsert: () => ({ active: true })
    },
    clock
  }

  function policyCondition(input: OAuthConnectedPolicyInput<unknown>): Fragment {
    let moduleId: string

    switch (input.kind) {
      case "sign-in":
        moduleId = input.credential.moduleId
        break
      case "action":
        moduleId = input.authorization.challenge.moduleId
        break
      case "metadata":
      case "use":
        moduleId = input.authorization.moduleId
    }
    const policy = policies.get(moduleId)

    if (policy === undefined) return sql`false`
    const grant = input.grant

    if (grant !== undefined) {
      if (grant.moduleId !== moduleId || grant.subjectId !== input.revision.subjectId) {
        return sql`false`
      }
      // Disconnect must remain possible after a profile is retired or removed.
      if (input.kind !== "action" || input.operation !== "disconnect") {
        const profile = policy.profiles.find(
          (value) => value.key === grant.configuration.profile.key && value.issuance === "active"
        )

        if (
          profile === undefined ||
          encodeProfile(profile) !==
            encodeProfile({
              ...grant.configuration.profile,
              issuance: "active"
            })
        ) {
          return sql`false`
        }
      }
    }

    const current = sql`exists(select 1 from ${subject.name} where ${subject.column(s.id)} = ${
      subject.value(s.id, input.subjectId)
    } and ${shared.subject.activeCondition} and ${
      exactSqlText(
        sql,
        subject.column(s.securityRevision),
        subject.value(s.securityRevision, input.revision.securityRevision)
      )
    })`

    if (input.kind === "sign-in") {
      return features.some((feature) => feature.moduleId === moduleId && feature.signIn)
        ? current
        : sql`false`
    }
    if (input.kind !== "action") {
      // Mutable application policy shares the subject's guarded security revision.
      return input.authorization.policyRevision === input.revision.securityRevision
        ? current
        : sql`false`
    }

    const { authorization } = input
    const { challenge, evidence, requirement } = authorization
    const action = input.operation === "settle" ? "connected-complete" : "connected-disconnect"

    if (
      challenge.action !== action ||
      !sameRevision(challenge.revision, input.revision) ||
      !sameRevision(evidence.revision, input.revision) ||
      evidence.flowId !== AuthenticationFlowId.make(challenge.flowId) ||
      evidence.bindingDigest !== challenge.bindingDigest ||
      !satisfies(evidence.proofs, requirement) ||
      evidence.proofs.some(
        (proof) => !input.revision.credentials.some((entry) => entry.credentialId === proof.credentialId)
      )
    ) {
      return sql`false`
    }

    const maximumAge = Math.min(requirement.maximumAgeMillis, policy.maximumEvidenceAgeMillis)
    const verified = evidence.proofs.map((proof) => DateTime.toEpochMillis(proof.verifiedAt))

    if (authorization.source._tag === "Session") {
      verified.push(DateTime.toEpochMillis(authorization.source.authenticatedAt))
    }

    return sql.and([
      current,
      sql`${now} < ${authorization.validUntilMillis}`,
      ...verified.map((instant) => sql`${now} >= ${instant} and ${now} < ${instant + maximumAge}`)
    ])
  }

  let context: Context.Context<never> = Context.empty()

  if (features.some((feature) => feature.signIn)) {
    const mapping = {
      ...shared,
      flow: { ...(yield* mapped("oauthSignInFlows")), encodeInsert: () => ({}) },
      constraints: requiredOAuthSignInConstraints
    } satisfies OAuthNativeReadMapping

    const services = yield* makeNativeOAuthSignInServices(tables, mapping, batch).pipe(
      (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, () => configurationError("Cannot configure OAuth sign-in persistence"))
        )
      )
    )

    context = Context.add(context, OAuth.OAuthSignInPersistence, services.oauthSignInPersistence)
    context = Context.add(
      context,
      IdentityImports,
      yield* makeNativeOAuthIdentityImports(tables, mapping).pipe(
        (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, () => configurationError("Cannot configure OAuth identity imports"))
          )
        )
      )
    )
  }
  if (policies.size > 0) {
    const job = { ...(yield* mapped("oauthConnectedRevocations")), encodeInsert: () => ({}) }
    const grant = { ...(yield* mapped("oauthConnectedGrants")), encodeInsert: () => ({}) }

    const mapping: OAuthNativeConnectedMapping = {
      ...shared,
      flow: { ...(yield* mapped("oauthConnectedFlows")), encodeInsert: () => ({}) },
      grant,
      policy: { condition: policyCondition },
      constraints: requiredOAuthConnectedConstraints,
      revocation: {
        mode: "provider",
        job,
        retentionMillis: revocationRetentionMillis,
        constraints: requiredOAuthConnectedRevocationConstraints
      },
      otherReferences: ({ identityKey, subjectId }) =>
        sql`exists(select 1 from ${credentials.name} where ${credentials.column("subjectId")} = ${
          credentials.value("subjectId", subjectId)
        } and ${exactSqlText(sql, credentials.column("identityKey"), credentials.value("identityKey", identityKey))})`
    }

    const connected = yield* makeNativeOAuthConnectedServices(tables, mapping, batch).pipe(
      (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, () => configurationError("Cannot configure OAuth connected persistence"))
        )
      )
    )

    const revocations = yield* makeNativeOAuthRevocationServices(
      tables,
      {
        ...mapping,
        job,
        constraints: requiredOAuthConnectedRevocationConstraints
      },
      batch
    ).pipe(
      (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, () => configurationError("Cannot configure OAuth revocation persistence"))
        )
      )
    )

    context = context.pipe(
      Context.add(OAuth.OAuthConnectedPersistence, {
        ...connected.oauthConnectedPersistence,
        read: (input) =>
          connected.oauthConnectedPersistence
            .read(input)
            .pipe(
              Effect.map((snapshot) =>
                snapshot === undefined
                  ? undefined
                  : { ...snapshot, policyRevision: snapshot.revision.securityRevision }
              )
            )
      }),
      Context.add(OAuth.OAuthConnectedRevocations, revocations.oauthConnectedRevocations)
    )
  }

  return context
})
