/**
 * PostgreSQL and SQLite persistence for provider OAuth flows, registration, linked accounts, and
 * retained grants. Factories capture services and validate physical storage on first use; provider
 * exchanges remain outside SQL transactions.
 *
 * @stability unstable
 * @since 4.1.0
 */
import { CurrentCommitJournal, hasCommitScope, type LifecycleHooks } from "@effect/auth/Hooks"
import {
  OAuthAccountsPersistence,
  OAuthConnectedPersistence,
  OAuthConnectedRevocations,
  OAuthRegistrationIntents,
  OAuthSignInPersistence,
  OAuthUnavailable
} from "@effect/auth/OAuth"
import { reportAuthDiagnostic, reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { PersistenceConfigurationError } from "./internal/configuration.ts"
import { makeNativeSqlTables } from "./internal/nativeSqlTable.ts"
import { makeNativeOAuthAccountsServices, type OAuthNativeAccountsMapping } from "./internal/oauth/nativeAccounts.ts"
import { makeNativeOAuthConnectedServices } from "./internal/oauth/nativeConnected.ts"
import type { OAuthNativeConnectedMapping } from "./internal/oauth/nativeConnectedState.ts"
import {
  makeNativeOAuthRegistrationIntentServices,
  makeNativeOAuthRegistrationServices,
  type OAuthNativeRegistrationIntentMapping,
  type OAuthNativeRegistrationMapping
} from "./internal/oauth/nativeRegistration.ts"
import {
  makeNativeOAuthRevocationServices,
  type OAuthNativeRevocationMapping
} from "./internal/oauth/nativeRevocations.ts"
import { makeNativeOAuthSignInServices } from "./internal/oauth/nativeSignIn.ts"
import type { OAuthNativeReadMapping } from "./internal/oauth/nativeState.ts"
import { captureOAuthMapping } from "./internal/oauth/state.ts"
import { CurrentSqlCommit, makeSqlCommitExecutor, SqlNativeCommit } from "./internal/sqlCommit.ts"
import { sql, SqlExpression } from "./internal/sqlExpression.ts"
import type { OAuthConnectedMapping, OAuthConnectedRevocationMapping } from "./internal/sqlOauthConnectedModel.ts"
import type {
  OAuthAccountsMapping,
  OAuthRegistrationAuthority,
  OAuthRegistrationIntentMapping,
  OAuthRegistrationMapping,
  OAuthSignInMapping
} from "./internal/sqlOauthModel.ts"
import { validateSqlStorage } from "./internal/sqlStorageValidation.ts"
import { Table } from "./internal/sqlTable.ts"
import { requireStandalone } from "./internal/standalone.ts"
import type { StorageTable } from "./internal/storageTables.ts"
import { withStorageValidation } from "./internal/storageValidation.ts"
export {
  /**
   * Builds a layer providing OAuth account management from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthAccountsPersistenceLayer,
  /**
   * Builds a layer providing retained OAuth grants from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthConnectedPersistenceLayer,
  /**
   * Builds a layer providing provider grant revocations from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthConnectedRevocationsLayer,
  /**
   * Builds a layer providing OAuth registration authority from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthRegistrationAuthorityLayer,
  /**
   * Builds a layer providing OAuth registration intents from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthRegistrationIntentsLayer,
  /**
   * Builds a layer providing OAuth sign-in persistence from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthSignInPersistenceLayer
} from "./internal/oauth/nativeLayers.ts"
export {
  /**
   * Creates subject and credential authority readers over explicit SQL table mappings.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeAuthenticationAuthorityServices
} from "./internal/sqlAuthority.ts"
export {
  /**
   * Combines the supplied mapped predicates with SQL AND, omitting undefined predicates.
   *
   * @stability unstable
   * @category combining
   * @since 4.1.0
   */
  and, /**
   * Creates a mapped SQL equality expression between two values or columns.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  eq, /**
   * Creates parameterized mapped SQL expressions and joins expression fragments using the executing
   * client's dialect.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  sql
} from "./internal/sqlExpression.ts"
export {
  /**
   * Connected-account action authorized by a retained-grant action challenge.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedAction,
  /**
   * Columns and row codecs for O auth sealed provider grants and exact refresh compare-and-set fields.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedGrantTable,
  /**
   * Table mappings, codecs, and policies for retained provider grants and guarded account policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedMapping,
  /**
   * Subject revision and action or grant context supplied to a guarded connected-account SQL policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedPolicyInput,
  /**
   * Columns and row codecs for O auth the removed grant ciphertext and single-use provider revocation
   * claim.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedRevocationJobTable,
  /**
   * Table mappings, codecs, and policies for single-use provider grant-revocation jobs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedRevocationMapping,
  /**
   * SQL predicate guarding a connected-account mutation against current subject policy and security
   * revision.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedSqlPolicy,
  /**
   * Uniqueness guarantees required for O auth connected storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthConnectedConstraints,
  /**
   * Uniqueness guarantees required for O auth connected revocation storage to arbitrate concurrent
   * writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthConnectedRevocationConstraints
} from "./internal/sqlOauthConnectedModel.ts"
export {
  /**
   * Table mappings, codecs, and policies for OAuth account linking, unlinking, eligibility, and cleanup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAccountsMapping,
  /**
   * OAuth account-management action authorized by an action challenge.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAction,
  /**
   * Columns and row codecs for O auth shared credential authority and current revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAuthorityReadTable,
  /**
   * Columns and row codecs for O auth shared credential authority and current revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAuthorityTable,
  /**
   * Captured subject-scoped table and condition for cleanup during an OAuth account mutation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCleanupDescriptor,
  /**
   * Columns and row codecs for O auth subject-scoped cleanup and retirement conditions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCleanupTable,
  /**
   * Captures a typed subject-scoped cleanup table for OAuth account mutations.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthCleanupTable,
  /**
   * Timestamp codecs and database-clock expressions used to compare authentication deadlines in SQL.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthClock,
  /**
   * Columns and row codecs for O auth credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCredentialReadTable,
  /**
   * Columns and row codecs for O auth credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCredentialTable,
  /**
   * Primary-database planning configuration for OAuth writes committed through D1 batches.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthD1Mapping,
  /**
   * Captured subject-scoped method table and condition used to assess remaining OAuth sign-in
   * eligibility.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityDescriptor,
  /**
   * Fact describing whether one installed authentication method remains eligible for a subject.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityFact,
  /**
   * Columns and row codecs for O auth subject-scoped authentication method eligibility.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityTable,
  /**
   * Captures a typed method table and eligibility predicate for OAuth account policy checks.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthEligibilityTable,
  /**
   * Columns and row codecs for O auth single-use challenge snapshots and access guards.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthFlowTable,
  /**
   * Columns and row codecs for O auth provider identity ownership and application subject binding.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthOwnershipReadTable,
  /**
   * Columns and row codecs for O auth provider identity ownership and application subject binding.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthOwnershipTable,
  /**
   * Service contract for inspecting and committing OAuth registration under one subject and identity
   * owner.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationAuthority,
  /**
   * Captured table ordering and predicate used to guard application OAuth registration conditions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationGuardDescriptor,
  /**
   * Columns and row codecs for O auth guarded application registration predicates and row ordering.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationGuardTable,
  /**
   * Captures a typed table predicate and deterministic row order for OAuth registration guards.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthRegistrationGuardTable,
  /**
   * Table mappings, codecs, and policies for OAuth registration intents and identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationIntentMapping,
  /**
   * Columns and row codecs for O auth the original registration binding and retained decision.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationIntentTable,
  /**
   * Table mappings, codecs, and policies for OAuth subject registration and identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationMapping,
  /**
   * Table mappings, codecs, and policies for OAuth sign-in and provider identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSignInMapping,
  /**
   * Columns and row codecs for O auth subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSubjectReadTable,
  /**
   * Columns and row codecs for O auth subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSubjectTable,
  /**
   * Uniqueness guarantees required for O auth registration storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthRegistrationConstraints,
  /**
   * Uniqueness guarantees required for O auth sign in storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthSignInConstraints,
  /**
   * Table model using this package's physical SQL table implementation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SqlTableModel
} from "./internal/sqlOauthModel.ts"

export {
  /**
   * Schema for a trusted provider, issuer, and external subject identity imported for an existing
   * application subject.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  IdentityImport, /**
   * Service that atomically imports previously established OAuth identity ownership without issuing a
   * grant or session.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  IdentityImports, /**
   * Schema for the credential ID and revision returned after importing a trusted OAuth identity.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ImportedIdentity
} from "./internal/oauth/identityImport.ts"

export {
  /**
   * Computes the stable SHA-256 storage key for an exact provider, issuer, and external-subject tuple.
   *
   * @stability unstable
   * @category encoding
   * @since 4.1.0
   */
  oauthIdentityKey as identityKey
} from "./internal/oauth/state.ts"

/**
 * Creates a typed SQL table definition from its physical columns and uniqueness guarantees.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const table = (definition: StorageTable) =>
  new Table(definition.name, definition.columns, definition.unique, definition.schema)

/**
 * Integer-millisecond timestamp codecs and database-clock SQL expressions for PostgreSQL and SQLite.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.0
 */
export const clock = {
  encodeInstant: Schema.encodeSync(Schema.Int),
  decodeInstant: Schema.decodeUnknownSync(Schema.Int),
  engineNowMillis: new SqlExpression((client) =>
    client.onDialectOrElse({
      pg: () => client`cast(extract(epoch from clock_timestamp()) * 1000 as bigint)`,
      orElse: () => client`cast(round((julianday('now') - 2440587.5) * 86400000) as integer)`
    })
  ),
  toMillis: (expression: SqlExpression) => expression,
  fromMillis: (expression: SqlExpression) => expression
}

const acquire = Effect.gen(function*() {
  const client = yield* SqlClient.SqlClient

  if (
    !client.onDialectOrElse({ pg: () => true, sqlite: () => true, orElse: () => false }) ||
    Predicate.hasProperty(client, "~@effect/sql-d1/D1Client")
  ) {
    yield* reportAuthDiagnostic("persistence-validation", "configuration")

    return yield* PersistenceConfigurationError.make({
      reason: "OAuth persistence requires PostgreSQL or SQLite with interactive transactions"
    })
  }

  return { client, tables: makeNativeSqlTables(client) }
})

const makeLazyServices = Effect.fnUntraced(function*<M, A>(
  original: M,
  make: (
    tables: ReturnType<typeof makeNativeSqlTables>,
    mapping: M
  ) => Effect.Effect<
    A,
    OAuthUnavailable,
    Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
  >
): Effect.fn.Return<
  Effect.Effect<A, OAuthUnavailable>,
  PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const { client, tables } = yield* acquire
  const mapping = captureOAuthMapping(original)

  // Preserve explicit ownership, but never retain the construction transaction's connection.
  const captured = yield* Effect.context<
    Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
  >().pipe(Effect.map(Context.omit(client.transactionService)))

  const executor = yield* makeSqlCommitExecutor(() => OAuthUnavailable.make({}))

  // Cache only validation and service construction; operations acquire their own connection.
  const initialize = yield* Effect.cached(
    validateSqlStorage(mapping).pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({})))),
      Effect.andThen(make(tables, mapping)),
      withStorageValidation,
      Effect.updateContext((current: Context.Context<never>) =>
        Context.merge(
          current.pipe(Context.omit(CurrentSqlCommit, CurrentCommitJournal, SqlNativeCommit)),
          captured
        )
      )
    )
  )

  // Check ownership before accessing the cache so rejected callers cannot initialize it.
  return executor.read(initialize)
})

const coordinate = Effect.fnUntraced(function*<S, A, E, R, ES, RS>(
  make: Effect.Effect<S, ES, RS>,
  body: (services: S) => Effect.Effect<A, E, R>
) {
  const { client } = yield* acquire

  if (yield* hasCommitScope) return yield* OAuthUnavailable.make({})
  yield* requireStandalone(() => OAuthUnavailable.make({}), client.transactionService)
  const executor = yield* makeSqlCommitExecutor(() => OAuthUnavailable.make({}))

  return yield* executor.coordinate(
    Effect.flatMap(
      reportPersistenceFailure(make, () => false, { markReported: true }).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
      ),
      body
    )
  )
})

/**
 * Creates OAuth sign-in flows services over explicit PostgreSQL or SQLite mappings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeOAuthSignInServices = Effect.fnUntraced(function*<N>(
  mapping: OAuthSignInMapping<Table, Table, Table, Table, Table, N>
): Effect.fn.Return<
  { readonly oauthSignInPersistence: OAuthSignInPersistence["Service"] },
  OAuthUnavailable | PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const services = yield* makeLazyServices(
    mapping,
    (tables, value) => makeNativeOAuthSignInServices(tables, value as unknown as OAuthNativeReadMapping)
  )

  return {
    oauthSignInPersistence: {
      issue: (input, prepare) => Effect.flatMap(services, (s) => s.oauthSignInPersistence.issue(input, prepare)),
      consume: (input, prepare) => Effect.flatMap(services, (s) => s.oauthSignInPersistence.consume(input, prepare)),
      resolve: (input) => Effect.flatMap(services, (s) => s.oauthSignInPersistence.resolve(input)),
      cleanup: (input, prepare) => Effect.flatMap(services, (s) => s.oauthSignInPersistence.cleanup(input, prepare))
    }
  }
})

/**
 * Runs OAuth sign-in flows and application writes under one SQL commit owner, providing the mapped
 * services to the effect.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const coordinateOAuthSignIn = <N, A, E, R>(
  options: { readonly mapping: OAuthSignInMapping<Table, Table, Table, Table, Table, N> },
  body: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | OAuthUnavailable | PersistenceConfigurationError,
  Exclude<R, OAuthSignInPersistence> | Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> =>
  coordinate(
    makeOAuthSignInServices(options.mapping),
    (services) => Effect.provideService(body, OAuthSignInPersistence, services.oauthSignInPersistence)
  )

/**
 * Creates OAuth account linking and unlinking services over explicit PostgreSQL or SQLite mappings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeOAuthAccountsServices = Effect.fnUntraced(function*<N>(
  mapping: OAuthAccountsMapping<Table, Table, Table, Table, Table, N>
): Effect.fn.Return<
  { readonly oauthAccountsPersistence: OAuthAccountsPersistence["Service"] },
  OAuthUnavailable | PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const services = yield* makeLazyServices(
    mapping,
    (tables, value) => makeNativeOAuthAccountsServices(tables, value as unknown as OAuthNativeAccountsMapping)
  )

  return {
    oauthAccountsPersistence: {
      list: (input) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.list(input)),
      capture: (input) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.capture(input)),
      issue: (input, prepare) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.issue(input, prepare)),
      consume: (input, prepare) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.consume(input, prepare)),
      link: (input, prepare) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.link(input, prepare)),
      readCredential: (input) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.readCredential(input)),
      unlink: (input, prepare) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.unlink(input, prepare)),
      cleanup: (input, prepare) => Effect.flatMap(services, (s) => s.oauthAccountsPersistence.cleanup(input, prepare))
    }
  }
})

/**
 * Runs OAuth account linking and unlinking and application writes under one SQL commit owner, providing
 * the mapped services to the effect.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const coordinateOAuthAccounts = <N, A, E, R>(
  options: { readonly mapping: OAuthAccountsMapping<Table, Table, Table, Table, Table, N> },
  body: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | OAuthUnavailable | PersistenceConfigurationError,
  | Exclude<R, OAuthAccountsPersistence>
  | Digest.Digest
  | SecureRandom.SecureRandom
  | LifecycleHooks
  | SqlClient.SqlClient
> =>
  coordinate(
    makeOAuthAccountsServices(options.mapping),
    (services) => Effect.provideService(body, OAuthAccountsPersistence, services.oauthAccountsPersistence)
  )

/**
 * Creates OAuth registration intents services over explicit PostgreSQL or SQLite mappings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeOAuthRegistrationIntentServices = Effect.fnUntraced(function*<N>(
  mapping: OAuthRegistrationIntentMapping<Table, Table, N>
): Effect.fn.Return<
  { readonly oauthRegistrationIntents: OAuthRegistrationIntents["Service"] },
  OAuthUnavailable | PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const services = yield* makeLazyServices(mapping, (tables, value) =>
    makeNativeOAuthRegistrationIntentServices(
      tables,
      value as unknown as OAuthNativeRegistrationIntentMapping
    ))

  return {
    oauthRegistrationIntents: {
      issue: (input, prepare) => Effect.flatMap(services, (s) => s.oauthRegistrationIntents.issue(input, prepare))
    }
  }
})

/**
 * Runs OAuth registration intents and application writes under one SQL commit owner, providing the
 * mapped services to the effect.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const coordinateOAuthRegistrationIntents = <N, A, E, R>(
  options: { readonly mapping: OAuthRegistrationIntentMapping<Table, Table, N> },
  body: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | OAuthUnavailable | PersistenceConfigurationError,
  | Exclude<R, OAuthRegistrationIntents>
  | Digest.Digest
  | SecureRandom.SecureRandom
  | LifecycleHooks
  | SqlClient.SqlClient
> =>
  coordinate(
    makeOAuthRegistrationIntentServices(options.mapping),
    (services) => Effect.provideService(body, OAuthRegistrationIntents, services.oauthRegistrationIntents)
  )

/**
 * Creates retained OAuth grants services over explicit PostgreSQL or SQLite mappings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeOAuthConnectedServices = Effect.fnUntraced(function*<N>(
  mapping: OAuthConnectedMapping<Table, Table, Table, Table, Table, N, Table>
): Effect.fn.Return<
  { readonly oauthConnectedPersistence: OAuthConnectedPersistence["Service"] },
  OAuthUnavailable | PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const services = yield* makeLazyServices(
    mapping,
    (tables, value) => makeNativeOAuthConnectedServices(tables, value as unknown as OAuthNativeConnectedMapping)
  )

  return {
    oauthConnectedPersistence: {
      read: (input) => Effect.flatMap(services, (s) => s.oauthConnectedPersistence.read(input)),
      issue: (input, prepare) => Effect.flatMap(services, (s) => s.oauthConnectedPersistence.issue(input, prepare)),
      consume: (input, prepare) => Effect.flatMap(services, (s) => s.oauthConnectedPersistence.consume(input, prepare)),
      settle: (input, prepare) => Effect.flatMap(services, (s) => s.oauthConnectedPersistence.settle(input, prepare)),
      list: (input) => Effect.flatMap(services, (s) => s.oauthConnectedPersistence.list(input)),
      disconnect: (input, prepare) =>
        Effect.flatMap(services, (s) => s.oauthConnectedPersistence.disconnect(input, prepare)),
      claimRefresh: (input, prepare) =>
        Effect.flatMap(services, (s) => s.oauthConnectedPersistence.claimRefresh(input, prepare)),
      settleRefresh: (input, prepare) =>
        Effect.flatMap(services, (s) => s.oauthConnectedPersistence.settleRefresh(input, prepare)),
      cleanup: (input, prepare) => Effect.flatMap(services, (s) => s.oauthConnectedPersistence.cleanup(input, prepare))
    }
  }
})

/**
 * Runs retained OAuth grants and application writes under one SQL commit owner, providing the mapped
 * services to the effect.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const coordinateOAuthConnected = <N, A, E, R>(
  options: { readonly mapping: OAuthConnectedMapping<Table, Table, Table, Table, Table, N, Table> },
  body: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | OAuthUnavailable | PersistenceConfigurationError,
  | Exclude<R, OAuthConnectedPersistence>
  | Digest.Digest
  | SecureRandom.SecureRandom
  | LifecycleHooks
  | SqlClient.SqlClient
> =>
  coordinate(
    makeOAuthConnectedServices(options.mapping),
    (services) => Effect.provideService(body, OAuthConnectedPersistence, services.oauthConnectedPersistence)
  )

/**
 * Creates provider grant-revocation jobs services over explicit PostgreSQL or SQLite mappings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeOAuthConnectedRevocationServices = Effect.fnUntraced(function*<N>(
  mapping: OAuthConnectedRevocationMapping<Table, Table, Table, N>
): Effect.fn.Return<
  { readonly oauthConnectedRevocations: OAuthConnectedRevocations["Service"] },
  OAuthUnavailable | PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const services = yield* makeLazyServices(
    mapping,
    (tables, value) => makeNativeOAuthRevocationServices(tables, value as unknown as OAuthNativeRevocationMapping)
  )

  return {
    oauthConnectedRevocations: {
      claim: (input, prepare) => Effect.flatMap(services, (s) => s.oauthConnectedRevocations.claim(input, prepare)),
      settle: (input, prepare) => Effect.flatMap(services, (s) => s.oauthConnectedRevocations.settle(input, prepare))
    }
  }
})

/**
 * Runs provider grant-revocation jobs and application writes under one SQL commit owner, providing the
 * mapped services to the effect.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const coordinateOAuthConnectedRevocations = <N, A, E, R>(
  options: { readonly mapping: OAuthConnectedRevocationMapping<Table, Table, Table, N> },
  body: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | OAuthUnavailable | PersistenceConfigurationError,
  | Exclude<R, OAuthConnectedRevocations>
  | Digest.Digest
  | SecureRandom.SecureRandom
  | LifecycleHooks
  | SqlClient.SqlClient
> =>
  coordinate(
    makeOAuthConnectedRevocationServices(options.mapping),
    (services) => Effect.provideService(body, OAuthConnectedRevocations, services.oauthConnectedRevocations)
  )

/**
 * Creates OAuth subject registration services over explicit PostgreSQL or SQLite mappings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeOAuthRegistrationServices = Effect.fnUntraced(function*<Registration, N>(
  mapping: OAuthRegistrationMapping<Registration, Table, Table, Table, Table, Table, N>
): Effect.fn.Return<
  { readonly registrationAuthority: OAuthRegistrationAuthority<Registration> },
  OAuthUnavailable | PersistenceConfigurationError,
  Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> {
  const services = yield* makeLazyServices(mapping, (tables, value) =>
    makeNativeOAuthRegistrationServices(
      tables,
      value as unknown as OAuthNativeRegistrationMapping<Registration>
    ))

  return {
    registrationAuthority: {
      authentication: "first-confirmed-registration",
      read: (input) => Effect.flatMap(services, (s) => s.registrationAuthority.read(input)),
      inspect: (input) => Effect.flatMap(services, (s) => s.registrationAuthority.inspect(input)),
      register: (input, prepare) => Effect.flatMap(services, (s) => s.registrationAuthority.register(input, prepare)),
      cleanup: (input, prepare) => Effect.flatMap(services, (s) => s.registrationAuthority.cleanup(input, prepare))
    }
  }
})

/**
 * Runs OAuth subject registration and application writes under one SQL commit owner, providing the
 * mapped services to the effect.
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.0
 */
export const coordinateOAuthRegistration = <Id, Registration, N, A, E, R>(
  options: {
    readonly mapping: OAuthRegistrationMapping<
      NoInfer<Registration>,
      Table,
      Table,
      Table,
      Table,
      Table,
      N
    >
    readonly target: Context.Key<Id, OAuthRegistrationAuthority<Registration>>
  },
  body: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | OAuthUnavailable | PersistenceConfigurationError,
  Exclude<R, Id> | Digest.Digest | SecureRandom.SecureRandom | LifecycleHooks | SqlClient.SqlClient
> =>
  coordinate(
    makeOAuthRegistrationServices(options.mapping),
    (services) => Effect.provideService(body, options.target, services.registrationAuthority)
  )

/**
 * Creates predicates retaining identity ownership while a connected grant or provider-revocation job
 * still references it.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const oauthConnectedOwnershipReferences = <N>(
  mapping: OAuthConnectedMapping<Table, Table, Table, Table, Table, N, Table>
) => ({
  connectedReference: (input: { readonly identityKey: string; readonly subjectId: N }) => {
    const g = mapping.grant
    const grant = sql`exists(select 1 from ${g.table} where ${
      g.table.columns[g.identityKey]
    } = ${input.identityKey} and ${g.table.columns[g.subjectId]} = ${input.subjectId})`

    if (mapping.revocation.mode === "unsupported") return grant
    const j = mapping.revocation.job

    return sql`(${grant}) or exists(select 1 from ${j.table} where ${
      j.table.columns[j.identityKey]
    } = ${input.identityKey} and ${j.table.columns[j.subjectId]} = ${input.subjectId})`
  }
})
