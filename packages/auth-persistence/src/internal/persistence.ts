import { EmailAddressPersistence, EmailUnavailable } from "@effect/auth/Email"
import type { LifecycleHooks } from "@effect/auth/Hooks"
import { CurrentCommitJournal, hasCommitScope } from "@effect/auth/Hooks"
import {
  OAuthConnectedPersistence,
  OAuthConnectedRevocations,
  OAuthSignInPersistence,
  OAuthUnavailable,
  snapshotOAuth
} from "@effect/auth/OAuth"
import {
  PasskeyCredentials,
  PasskeyManagementPersistence,
  PasskeyPersistence,
  PasskeyUnavailable
} from "@effect/auth/Passkey"
import { PasswordPersistence, PasswordUnavailable } from "@effect/auth/Password"
import { hooksLayer, reportAuthDiagnostic, reportPersistenceFailure } from "@effect/auth/Persistence"
import { PhoneOtpUnavailable, PhoneSignInTargets } from "@effect/auth/PhoneOtp"
import { ProofPersistence, ProofUnavailable } from "@effect/auth/Proofs"
import { AuthenticationAuthority, SessionUnavailable } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import {
  type ClaimsCodec,
  type ConfigId,
  type Definition,
  type OAuthFeature,
  type PasskeyFeature,
  type PasskeyRequirement,
  type PersistenceApi,
  PersistenceConfigurationError,
  type Ports,
  type Provisioning,
  type ProvisioningRequirement,
  type Roles,
  type StorageLayout,
  type SubjectMapping,
  type SubjectOptions
} from "./configuration.ts"
import { makeNativeEmailAddressServices } from "./emailNative.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { IdentityImport, IdentityImports } from "./oauth/identityImport.ts"
import { makeManagedOAuth } from "./oauthManaged.ts"
import { makeManagedPasskeys } from "./passkeyManaged.ts"
import { makeNativePasswordServices } from "./passwordNative.ts"
import { makeComposedPhoneTargets } from "./phoneComposed.ts"
import { makeNativeProofServices } from "./proofNative.ts"
import { makeRegistrationAuthority } from "./registration.ts"
import type { PasswordRegistrationAuthority } from "./registrationContract.ts"
import { makeNativeAuthenticationAuthorityServices } from "./sessionNativeAuthority.ts"
import { makeNativeSessionCleanupServices, ManagedSqlitePendingCleanup } from "./sessionNativeCleanup.ts"
import { makeNativePendingAuthenticationServices } from "./sessionNativeLogin.ts"
import { makeNativeStatefulSessionServices } from "./sessionNativeStateful.ts"
import { makeNativeSessionStepUpServices } from "./sessionNativeStepUp.ts"
import { CurrentSqlCommit, SqlBatchCommit, SqlNativeCommit } from "./sqlCommit.ts"
import { requireStandalone } from "./standalone.ts"
import { makeMappings } from "./storageMapping.ts"
import { type StorageRole, type StorageTable, storageTables, tableDefinition } from "./storageTables.ts"
import {
  hasManagedSqliteCleanupKey,
  type StorageValidation,
  validateStorageBatch,
  withStorageValidation
} from "./storageValidation.ts"

export interface Backend<T extends object, R, Database extends object = object> {
  readonly makeTable: (definition: StorageTable) => T
  readonly describe: (table: T) => StorageTable
  readonly acquire: Effect.Effect<Database, PersistenceConfigurationError, R | SqlClient.SqlClient>
  readonly nativeTables: (database: Database) => NativeSqlTables
  /** Fixed atomic batches replace interactive transactions on backends such as D1. */
  readonly batch?: (database: Database) => NonNullable<SqlBatchCommit["Service"]>
}

const configError = (reason: string) => PersistenceConfigurationError.make({ reason })

const mappingError = (cause: unknown) => PersistenceMappingError.make({ operation: "mapping", cause })

const timestampKeys = new Set([
  "verifiedAt",
  "createdAt",
  "lastIssueAt",
  "issuedAt",
  "expiresAt",
  "absoluteExpiresAt",
  "retentionUntil",
  "claimDeadline",
  "retryAt",
  "admittedAt",
  "deadline",
  "occurredAt",
  "dedupUntil",
  "binderExpiresAt",
  "refreshClaimedAt",
  "refreshClaimExpiresAt",
  "claimedAt",
  "claimExpiresAt"
])

export const createPersistence = <T extends object, R, Database extends object = object>(
  backend: Backend<T, R, Database>
): PersistenceApi<T, R> => {
  const make = <C extends ClaimsCodec, const Id extends string, const A extends Definition<C, Id>>(
    auth: A & Definition<C, Id>
  ) => {
    const features = Object.values(auth.strategies).flatMap((strategy) =>
      strategy.persistence === undefined ? [] : [strategy.persistence]
    )

    const phone = features.some((feature) => feature.kind === "phone")
    const password = features.some((feature) => feature.kind === "password")

    const passkeys = features.filter(
      (feature): feature is PasskeyFeature => feature.kind === "passkey"
    )

    const oauth = features.filter((feature): feature is OAuthFeature => feature?.kind === "oauth")
    const oauthSignIn = oauth.some((feature) => feature.signIn)
    const oauthConnected = oauth.some((feature) => feature.connected !== undefined)
    const stateful = auth.sessionMode === "stateful"

    const stateless = auth.sessionMode === "stateless" &&
      features.length > 0 &&
      features.every((feature) => feature?.kind === "oauth")

    const management = features.some(
      (feature) => feature.kind === "password" && feature.management
    )

    const email = features.some((feature) => feature.kind === "email" && feature.addresses)
    const proofs = phone || management || email

    const roles: Array<StorageRole> = ["identifiers", "credentials"]

    if (stateful) roles.push("sessions")
    roles.push("pending")
    if (password) roles.push("passwords")
    if (email) roles.push("emailCredentials")
    if (passkeys.length > 0) roles.push("passkeyCredentials", "passkeyFlows")
    if (proofs) roles.push("proofs")
    if (oauth.length > 0) roles.push("oauthIdentities", "oauthCredentials")
    if (oauthSignIn) roles.push("oauthSignInFlows")
    if (oauthConnected) {
      roles.push("oauthConnectedFlows", "oauthConnectedGrants", "oauthConnectedRevocations")
    }

    const ConfigKey = Context.Service<
      ConfigId<A["namespace"]>,
      StorageLayout<T, Roles<C, Id, A>>
    >()(`@effect/auth-persistence/${auth.namespace}/Config`)

    const Config = Object.assign(ConfigKey, {
      layer: (value: StorageLayout<T, Roles<C, Id, A>>) => Layer.succeed(ConfigKey, value)
    })

    const ProvisioningKey = Context.Service<ProvisioningRequirement<A>, Provisioning<A>>()(
      `@effect/auth-persistence/${auth.namespace}/Provisioning`
    )

    // Only tables generated by this Auth composition, with its built-in integer
    // clock, may acquire the stronger pending cleanup contract.
    const managedPending = new WeakMap<object, object>()

    const layout = <N, Instant>(
      options: {
        readonly subjects: SubjectOptions<T, N>
        readonly tables?: Partial<Record<StorageRole, T>>
        readonly prefix?: string
        readonly timestamps?: {
          readonly type: "text" | "integer"
          readonly codec: Schema.Codec<number, Instant>
        }
      },
      managed: boolean
    ): StorageLayout<T, Roles<C, Id, A>> => {
      const subject = options.subjects

      if (passkeys.length > 0 && options.timestamps !== undefined) {
        // oxlint-disable-next-line effect/no-untyped-throw -- The schema declaration API must return tables synchronously for consumers and Drizzle Kit.
        throw configError(
          "Composed passkey storage uses integer milliseconds; use an explicit passkey adapter for a custom timestamp representation"
        )
      }
      const description = backend.describe(subject.table)
      const idColumn = description.columns[subject.id]

      for (const key of [subject.id, subject.status, subject.securityRevision]) {
        if (description.columns[key] === undefined) {
          // oxlint-disable-next-line effect/no-untyped-throw -- The schema declaration API must return tables synchronously for consumers and Drizzle Kit.
          throw configError(`Missing subject column ${key}`)
        }
      }
      if (subject.activeValue === undefined) {
        // oxlint-disable-next-line effect/no-untyped-throw -- The schema declaration API must return tables synchronously for consumers and Drizzle Kit.
        throw configError("An explicit active subject value is required")
      }

      if (idColumn === undefined || idColumn.type === "boolean") {
        // oxlint-disable-next-line effect/no-untyped-throw -- The schema declaration API must return tables synchronously for consumers and Drizzle Kit.
        throw configError("Subject ID must map a text or integer column")
      }

      const prefix = options.prefix

      if (managed && (prefix === undefined || !/^[A-Za-z_][A-Za-z0-9_]{0,100}$/.test(prefix))) {
        // oxlint-disable-next-line effect/no-untyped-throw -- The schema declaration API must return tables synchronously for consumers and Drizzle Kit.
        throw configError("Managed persistence requires an explicit SQL table prefix")
      }

      const schema: Partial<Record<StorageRole, T>> = { ...options.tables }
      let generatedPending: T | undefined

      for (const role of roles) {
        if (schema[role] === undefined && managed) {
          const definition = tableDefinition(role, `${prefix}_${role}`, idColumn.type)

          const adjusted = options.timestamps === undefined
            ? definition
            : {
              ...definition,
              columns: Object.fromEntries(
                Object.entries(definition.columns).map(([key, column]) => [
                  key,
                  timestampKeys.has(key)
                    ? { ...column, type: options.timestamps?.type ?? column.type }
                    : column
                ])
              )
            }

          const generated = backend.makeTable(adjusted)

          schema[role] = generated
          if (role === "pending" && options.timestamps === undefined) generatedPending = generated
        }
      }
      for (const role of roles) {
        if (schema[role] === undefined) {
          // oxlint-disable-next-line effect/no-untyped-throw -- The schema declaration API must return tables synchronously for consumers and Drizzle Kit.
          throw configError(`Missing ${role} table`)
        }
      }
      const instantCodec = options.timestamps?.codec

      const decodeInstant = instantCodec === undefined
        ? Schema.decodeUnknownEffect(Schema.Int)
        : Schema.decodeUnknownEffect(instantCodec)

      const decodeInstantSync = instantCodec === undefined
        ? Schema.decodeUnknownSync(Schema.Int)
        : Schema.decodeUnknownSync(instantCodec)

      const subjects: SubjectMapping = {
        table: subject.table,
        id: subject.id,
        status: subject.status,
        securityRevision: subject.securityRevision,
        activeValue: subject.activeValue,
        requirements: subject.requirements,
        actionRequirements: subject.actionRequirements ?? subject.requirements,
        toSubject: (id) =>
          Schema.decodeUnknownEffect(subject.idCodec)(id).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, mappingError)))
          ),
        toNative: (id) =>
          Schema.encodeEffect(subject.idCodec)(id).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, mappingError)))
          ),
        toSubjectSync: Schema.decodeUnknownSync(subject.idCodec),
        toNativeSync: Schema.encodeSync(subject.idCodec)
      }

      const result = Object.freeze({
        namespace: auth.namespace,
        schema: Object.freeze(schema) as Readonly<Record<Roles<C, Id, A>, T>>,
        tables: schema,
        subjects,
        encodeInstant: instantCodec === undefined ? (millis: number) => millis : Schema.encodeSync(instantCodec),
        decodeInstant: (value: unknown) =>
          decodeInstant(value).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, mappingError)))
          ),
        decodeInstantSync
      })

      if (generatedPending !== undefined) managedPending.set(result, generatedPending)

      return result
    }

    const services = Layer.effectContext(
      Effect.flatMap(backend.acquire, (database) =>
        Effect.gen(function*() {
          const storage = yield* ConfigKey
          const client = yield* SqlClient.SqlClient

          const dialect = client.onDialectOrElse({
            pg: () => "pg" as const,
            sqlite: () => "sqlite" as const,
            orElse: () => undefined
          })

          if (dialect === undefined) {
            return yield* configError("Use an explicit adapter for this SQL dialect")
          }
          if (
            features.some(
              (feature) =>
                ("lifecycle" in feature && feature.lifecycle) ||
                (feature.kind === "email" && !feature.addresses)
            )
          ) {
            return yield* configError(
              "Use explicit services for strategies without composed persistence support"
            )
          }
          if (storage.namespace !== auth.namespace) {
            return yield* configError(
              "Persistence configuration belongs to a different Auth definition"
            )
          }
          const validations: Array<StorageValidation> = []

          for (const role of roles) {
            const table = (storage.schema as Partial<Record<StorageRole, T>>)[role]

            if (table === undefined) return yield* configError(`Missing ${role} table`)
            const description = backend.describe(table)
            const columns = description.columns

            for (const name of Object.keys(storageTables[role].columns)) {
              if (columns[name] === undefined) {
                return yield* configError(`Missing ${role}.${name} column`)
              }
            }
            validations.push({ table: description, required: storageTables[role].unique })
          }
          validations.push({
            table: backend.describe(storage.subjects.table as T),
            required: [[storage.subjects.id]]
          })
          yield* validateStorageBatch(dialect, validations)
          const nativeTables = backend.nativeTables(database)
          const mappings = yield* makeMappings(storage, nativeTables)

          const sessionMapping = stateful
            ? yield* mappings.sessions(auth.claims, auth.sessions.moduleId)
            : undefined

          const pendingMapping = yield* mappings.pending(auth.claims, auth.sessions.moduleId)

          const { authenticationAuthority } = yield* makeNativeAuthenticationAuthorityServices(
            nativeTables,
            sessionMapping ?? {
              ...pendingMapping,
              pending: { pending: pendingMapping.pending, login: pendingMapping.login }
            }
          )

          const { pendingAuthentication } = yield* makeNativePendingAuthenticationServices(
            nativeTables,
            pendingMapping
          )

          const { sessionStepUpPersistence } = yield* makeNativeSessionStepUpServices(
            nativeTables,
            {
              ...pendingMapping,
              source: sessionMapping === undefined
                ? { kind: "StatelessSigned" }
                : {
                  kind: "Stateful",
                  session: sessionMapping.session,
                  sessionId: sessionMapping.sessionId,
                  constraints: { sessionDigest: "unique(session.digest)" }
                }
            }
          )

          const pendingTable = pendingMapping.pending.table

          const boundedPending = dialect === "sqlite" &&
            managedPending.get(storage) === pendingTable &&
            (yield* hasManagedSqliteCleanupKey(backend.describe(pendingTable as T), "digest"))

          const { sessionCleanup } = yield* makeNativeSessionCleanupServices(
            nativeTables,
            pendingMapping
          ).pipe(
            Effect.provideService(
              ManagedSqlitePendingCleanup,
              boundedPending ? pendingTable : undefined
            )
          )

          let context: Context.Context<never> = Context.make(
            AuthenticationAuthority,
            authenticationAuthority
          ).pipe(
            Context.add(auth.sessions.PendingAuthentication, pendingAuthentication),
            Context.add(auth.sessions.SessionStepUpPersistence, sessionStepUpPersistence),
            Context.add(auth.sessions.SessionCleanup, sessionCleanup)
          )

          if (sessionMapping !== undefined) {
            const sessionServices = yield* makeNativeStatefulSessionServices(
              nativeTables,
              sessionMapping
            )

            context = context.pipe(
              Context.add(
                auth.sessions.StatefulSessionPersistence,
                sessionServices.statefulSessionPersistence
              ),
              Context.add(auth.sessions.SessionRepository, sessionServices.sessionRepository)
            )
          }

          const proofMapping = proofs ? yield* mappings.proofs() : undefined

          if (proofMapping !== undefined) {
            const services = yield* makeNativeProofServices(
              backend.nativeTables(database),
              proofMapping
            )

            context = Context.add(context, ProofPersistence, services.proofPersistence)
          }

          if (password) {
            const mapping = yield* mappings.passwords()

            const services = yield* makeNativePasswordServices(
              backend.nativeTables(database),
              mapping,
              proofMapping
            )

            context = Context.add(context, PasswordPersistence, services.passwordPersistence)
          }
          for (const [name, strategy] of Object.entries(auth.strategies)) {
            if (strategy.persistence?.kind !== "password" || !strategy.persistence.management) {
              continue
            }
            const key = strategy.RegistrationAuthority

            if (key === undefined) {
              return yield* configError(`Missing subject provisioning for ${name}`)
            }

            const registration = yield* makeRegistrationAuthority(
              backend.nativeTables(database),
              yield* mappings.passwords(),
              ProvisioningKey,
              name
            )

            context = Context.add(context, key, registration)
          }
          if (email) {
            context = Context.add(
              context,
              EmailAddressPersistence,
              (yield* makeNativeEmailAddressServices(
                backend.nativeTables(database),
                yield* mappings.emails(),
                proofMapping
              )).emailAddressPersistence
            )
          }

          if (phone) {
            context = Context.add(
              context,
              PhoneSignInTargets,
              yield* makeComposedPhoneTargets(
                backend.nativeTables(database),
                storage,
                yield* mappings.proofs(),
                features.flatMap((feature) => (feature.kind === "phone" ? [feature.moduleId] : []))
              )
            )
          }

          if (passkeys.length > 0) {
            // This existential definition has lost its strategy types. The checked passkey
            // metadata matches PasskeyRequirement<A>; keep the public conditional requirement.
            const services = makeManagedPasskeys(
              {
                storage,
                namespace: auth.namespace,
                dialect,
                features: passkeys,
                passwordModules: features.flatMap((feature) => feature.kind === "password" ? [feature.moduleId] : [])
              },
              backend.nativeTables(database)
            ) as Effect.Effect<
              Context.Context<never>,
              PersistenceConfigurationError,
              | PasskeyRequirement<A>
              | Digest.Digest
              | SecureRandom.SecureRandom
              | LifecycleHooks
              | SqlClient.SqlClient
              | SqlBatchCommit
            >

            context = Context.merge(context, yield* services)
          }

          if (oauth.length > 0) {
            context = Context.merge(context, yield* makeManagedOAuth(storage, nativeTables, oauth))
          }

          // The checked capability metadata above determines exactly these service keys.
          return context as Context.Context<Ports<C, Id, A>>
        }).pipe(Effect.provideService(SqlBatchCommit, backend.batch?.(database)))).pipe(withStorageValidation)
    ).pipe(Layer.provide(hooksLayer))

    const layer = Layer.effectContext(
      Effect.gen(function*() {
        if (!stateful && !stateless) {
          if (auth.sessionMode === "stateless") {
            return yield* configError(
              "Composed stateless sessions support only OAuth strategies; use explicit persistence for other strategies"
            )
          }

          return yield* configError(
            "Composed persistence supports stateful or OAuth-only stateless sessions; state-assisted validity and other session modes require explicit persistence"
          )
        }
        const scope = yield* Effect.scope
        const captured = yield* Effect.context<Layer.Services<typeof services>>()
        const client = Context.get(captured, SqlClient.SqlClient)
        const started = yield* Ref.make(false)

        // Keep the layer's dependencies and lifetime while letting its SQL acquirer
        // resolve request-local services. Never capture the caller's commit owner
        // or transaction in the shared services built by the first operation.
        // cached shares active waiters and completed failures, but discards interrupted
        // runs. Claim the sole attempt before building so abandoning all waiters cannot
        // restart partially completed setup, even while its finalizers are still running.
        const initialize = yield* Effect.cached(
          Effect.flatMap(Ref.getAndSet(started, true), (alreadyStarted) =>
            alreadyStarted
              ? Effect.succeed(undefined)
              : Layer.buildWithScope(services, scope).pipe(
                Effect.updateContext((current: Context.Context<never>) =>
                  Context.merge(
                    current.pipe(
                      Context.omit(
                        CurrentSqlCommit,
                        CurrentCommitJournal,
                        SqlNativeCommit,
                        client.transactionService
                      )
                    ),
                    captured
                  )
                )
              ))
        )

        const service = Effect.fnUntraced(function*<I, S, Failure>(
          key: Context.Key<I, S>,
          unavailable: () => Failure,
          standalone = true
        ): Effect.fn.Return<S, Failure> {
          // Reject unsupported ownership before setup can perform any writes.
          // Session/authority reads retain their existing ambient-read semantics.
          if (standalone) {
            if (yield* hasCommitScope) return yield* Effect.fail(unavailable())
            yield* requireStandalone(unavailable, client.transactionService)
          }

          // Observe the cached failure in this invocation, not the captured setup context.
          const acquired = yield* reportPersistenceFailure(initialize, () => false, {
            markReported: true
          }).pipe(
            Effect.tapError((error) =>
              reportAuthDiagnostic(
                "persistence-initialization",
                Schema.is(PersistenceConfigurationError)(error)
                  ? "configuration"
                  : Schema.is(PersistenceMappingError)(error)
                  ? "mapping"
                  : "unavailable"
              )
            ),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
          )

          if (acquired === undefined) {
            yield* reportAuthDiagnostic("persistence-initialization", "unavailable")

            return yield* Effect.fail(unavailable())
          }
          const value = Context.getOrUndefined(acquired, key)

          return value === undefined ? yield* Effect.fail(unavailable()) : value
        })

        const sessionUnavailable = () => SessionUnavailable.make({})
        const authority = service(AuthenticationAuthority, sessionUnavailable, false)
        const authorityMutation = service(AuthenticationAuthority, sessionUnavailable)

        const pendingRead = service(auth.sessions.PendingAuthentication, sessionUnavailable, false)
        const pendingMutation = service(auth.sessions.PendingAuthentication, sessionUnavailable)

        const stepUpRead = service(
          auth.sessions.SessionStepUpPersistence,
          sessionUnavailable,
          false
        )

        const stepUpMutation = service(auth.sessions.SessionStepUpPersistence, sessionUnavailable)
        const cleanup = service(auth.sessions.SessionCleanup, sessionUnavailable)

        let context: Context.Context<never> = Context.make(AuthenticationAuthority, {
          capture: (subjectId, credentialIds) => Effect.flatMap(authority, (s) => s.capture(subjectId, credentialIds)),
          requirements: (evidence) => Effect.flatMap(authority, (s) => s.requirements(evidence)),
          approve: (input, prepare) => Effect.flatMap(authorityMutation, (s) => s.approve(input, prepare))
        }).pipe(
          Context.add(auth.sessions.PendingAuthentication, {
            create: (input, now, prepare) => Effect.flatMap(pendingMutation, (s) => s.create(input, now, prepare)),
            read: (input) => Effect.flatMap(pendingRead, (s) => s.read(input)),
            reject: (input, prepare) => Effect.flatMap(pendingMutation, (s) => s.reject(input, prepare))
          }),
          Context.add(auth.sessions.SessionStepUpPersistence, {
            create: (input, now, prepare) => Effect.flatMap(stepUpMutation, (s) => s.create(input, now, prepare)),
            read: (input) => Effect.flatMap(stepUpRead, (s) => s.read(input)),
            reject: (input, prepare) => Effect.flatMap(stepUpMutation, (s) => s.reject(input, prepare)),
            complete: (plan, prepare) => Effect.flatMap(stepUpMutation, (s) => s.complete(plan, prepare))
          }),
          Context.add(auth.sessions.SessionCleanup, {
            cleanup: (input) => Effect.flatMap(cleanup, (s) => s.cleanup(input))
          })
        )

        if (stateful) {
          const sessions = service(
            auth.sessions.StatefulSessionPersistence,
            sessionUnavailable,
            false
          )

          const sessionMutations = service(
            auth.sessions.StatefulSessionPersistence,
            sessionUnavailable
          )

          const repository = service(auth.sessions.SessionRepository, sessionUnavailable, false)

          context = context.pipe(
            Context.add(auth.sessions.StatefulSessionPersistence, {
              establish: (input, prepare) => Effect.flatMap(sessionMutations, (s) => s.establish(input, prepare)),
              verify: (input) => Effect.flatMap(sessions, (s) => s.verify(input)),
              rotate: (input, prepare) => Effect.flatMap(sessionMutations, (s) => s.rotate(input, prepare)),
              revokeDigest: (digest, prepare) =>
                Effect.flatMap(sessionMutations, (s) => s.revokeDigest(digest, prepare)),
              revoke: (input, prepare) => Effect.flatMap(sessionMutations, (s) => s.revoke(input, prepare)),
              revokeAll: (input, prepare) => Effect.flatMap(sessionMutations, (s) => s.revokeAll(input, prepare))
            }),
            Context.add(auth.sessions.SessionRepository, {
              list: (input) => Effect.flatMap(repository, (s) => s.list(input))
            })
          )
        }

        if (proofs) {
          const persistence = service(ProofPersistence, () => ProofUnavailable.make({}))

          context = Context.add(context, ProofPersistence, {
            issue: (input, prepare) => Effect.flatMap(persistence, (s) => s.issue(input, prepare)),
            redeem: (input, prepare) => Effect.flatMap(persistence, (s) => s.redeem(input, prepare)),
            cancel: (input, prepare) => Effect.flatMap(persistence, (s) => s.cancel(input, prepare)),
            cleanup: (input, prepare) => Effect.flatMap(persistence, (s) => s.cleanup(input, prepare))
          })
        }
        if (password) {
          const persistence = service(PasswordPersistence, () => PasswordUnavailable.make({}))

          context = Context.add(context, PasswordPersistence, {
            findCredential: (input) => Effect.flatMap(persistence, (s) => s.findCredential(input)),
            rehashIfCurrent: (input) => Effect.flatMap(persistence, (s) => s.rehashIfCurrent(input)),
            readForSubject: (input) => Effect.flatMap(persistence, (s) => s.readForSubject(input)),
            recoveryTarget: (input) => Effect.flatMap(persistence, (s) => s.recoveryTarget(input)),
            addIfAbsent: (input, prepare) => Effect.flatMap(persistence, (s) => s.addIfAbsent(input, prepare)),
            replaceIfCurrent: (input, prepare) =>
              Effect.flatMap(persistence, (s) => s.replaceIfCurrent(input, prepare)),
            resetWithProof: (input, prepare) => Effect.flatMap(persistence, (s) => s.resetWithProof(input, prepare))
          })
        }
        for (const [name, strategy] of Object.entries(auth.strategies)) {
          if (strategy.persistence?.kind !== "password" || !strategy.persistence.management) {
            continue
          }
          const key = strategy.RegistrationAuthority

          if (key === undefined) {
            return yield* configError(`Missing subject provisioning for ${name}`)
          }

          // The heterogeneous strategy table erases the registration input type;
          // its decoded value is forwarded unchanged to the same authority key.
          const registration = service(
            key as Context.Key<unknown, PasswordRegistrationAuthority<unknown>>,
            () => PasswordUnavailable.make({})
          )

          context = Context.add(
            context,
            key,
            {
              register: (input, prepare) => Effect.flatMap(registration, (s) => s.register(input, prepare))
            } satisfies PasswordRegistrationAuthority<unknown>
          )
        }
        if (email) {
          const persistence = service(EmailAddressPersistence, () => EmailUnavailable.make({}))

          context = Context.add(context, EmailAddressPersistence, {
            target: (input) => Effect.flatMap(persistence, (s) => s.target(input)),
            verifyWithProof: (input, prepare) => Effect.flatMap(persistence, (s) => s.verifyWithProof(input, prepare)),
            changeWithProof: (input, prepare) => Effect.flatMap(persistence, (s) => s.changeWithProof(input, prepare))
          })
        }
        if (phone) {
          const unavailable = () => PhoneOtpUnavailable.make({})
          const targets = service(PhoneSignInTargets, unavailable)

          context = context.pipe(
            Context.add(PhoneSignInTargets, {
              lookup: (input) => Effect.flatMap(targets, (s) => s.lookup(input))
            })
          )
        }
        if (passkeys.length > 0) {
          const unavailable = () => PasskeyUnavailable.make({})
          const credentials = service(PasskeyCredentials, unavailable)
          const persistence = service(PasskeyPersistence, unavailable)

          context = context.pipe(
            Context.add(PasskeyCredentials, {
              lookup: (input) => Effect.flatMap(credentials, (s) => s.lookup(input)),
              listForSubject: (input) => Effect.flatMap(credentials, (s) => s.listForSubject(input))
            }),
            Context.add(PasskeyPersistence, {
              issue: (input, prepare) => Effect.flatMap(persistence, (s) => s.issue(input, prepare)),
              context: (input) => Effect.flatMap(persistence, (s) => s.context(input)),
              consume: (input, prepare) => Effect.flatMap(persistence, (s) => s.consume(input, prepare)),
              cleanup: (input, prepare) => Effect.flatMap(persistence, (s) => s.cleanup(input, prepare))
            })
          )
          if (passkeys.some((feature) => feature.management)) {
            const manager = service(PasskeyManagementPersistence, unavailable)

            context = context.pipe(
              Context.add(PasskeyManagementPersistence, {
                list: (input) => Effect.flatMap(manager, (s) => s.list(input)),
                completeEnrollment: (input, prepare) =>
                  Effect.flatMap(manager, (s) => s.completeEnrollment(input, prepare)),
                inspectRemove: (input) => Effect.flatMap(manager, (s) => s.inspectRemove(input)),
                remove: (input, prepare) => Effect.flatMap(manager, (s) => s.remove(input, prepare)),
                rename: (input, prepare) => Effect.flatMap(manager, (s) => s.rename(input, prepare))
              })
            )
          }
        }

        const oauthUnavailable = () => OAuthUnavailable.make({})

        function oauthService<I, S>(
          key: Context.Key<I, S>,
          moduleId: string,
          capability: "signIn" | "connected"
        ): Effect.Effect<S, OAuthUnavailable> {
          const enabled = oauth.some(
            (feature) =>
              feature.moduleId === moduleId &&
              (capability === "signIn" ? feature.signIn : feature.connected !== undefined)
          )

          return enabled ? service(key, oauthUnavailable) : Effect.fail(oauthUnavailable())
        }

        if (oauthSignIn) {
          const persistence = (moduleId: string) => oauthService(OAuthSignInPersistence, moduleId, "signIn")

          context = Context.add(context, OAuthSignInPersistence, {
            issue: (input, prepare) =>
              Effect.flatMap(persistence(input.context.moduleId), (s) => s.issue(input, prepare)),
            consume: (input, prepare) => Effect.flatMap(persistence(input.moduleId), (s) => s.consume(input, prepare)),
            resolve: (input) => Effect.flatMap(persistence(input.moduleId), (s) => s.resolve(input)),
            cleanup: (input, prepare) => Effect.flatMap(persistence(input.moduleId), (s) => s.cleanup(input, prepare))
          })
          context = Context.add(context, IdentityImports, {
            importIdentity: Effect.fnUntraced(function*(original) {
              const input = yield* snapshotOAuth(IdentityImport, original)
              const persistence = yield* oauthService(IdentityImports, input.moduleId, "signIn")

              return yield* persistence.importIdentity(input)
            })
          })
        }
        if (oauthConnected) {
          const persistence = (moduleId: string) => oauthService(OAuthConnectedPersistence, moduleId, "connected")

          const revocations = (moduleId: string) => oauthService(OAuthConnectedRevocations, moduleId, "connected")

          context = context.pipe(
            Context.add(OAuthConnectedPersistence, {
              read: (input) => Effect.flatMap(persistence(input.moduleId), (s) => s.read(input)),
              issue: (input, prepare) =>
                Effect.flatMap(persistence(input.context.moduleId), (s) => s.issue(input, prepare)),
              consume: (input, prepare) =>
                Effect.flatMap(persistence(input.moduleId), (s) => s.consume(input, prepare)),
              settle: (input, prepare) =>
                Effect.flatMap(persistence(input.grant.context.moduleId), (s) => s.settle(input, prepare)),
              list: (input) => Effect.flatMap(persistence(input.authorization.moduleId), (s) => s.list(input)),
              disconnect: (input, prepare) =>
                Effect.flatMap(persistence(input.key.moduleId), (s) => s.disconnect(input, prepare)),
              claimRefresh: (input, prepare) =>
                Effect.flatMap(persistence(input.grant.context.moduleId), (s) => s.claimRefresh(input, prepare)),
              settleRefresh: (input, prepare) =>
                Effect.flatMap(persistence(input.claim.grant.context.moduleId), (s) => s.settleRefresh(input, prepare)),
              cleanup: (input, prepare) => Effect.flatMap(persistence(input.moduleId), (s) => s.cleanup(input, prepare))
            }),
            Context.add(OAuthConnectedRevocations, {
              claim: (input, prepare) => Effect.flatMap(revocations(input.moduleId), (s) => s.claim(input, prepare)),
              settle: (input, prepare) =>
                Effect.flatMap(revocations(input.claim.job.grant.context.moduleId), (s) => s.settle(input, prepare))
            })
          )
        }

        // Match the same capability-selected service keys as the acquired graph.
        return context as Context.Context<Ports<C, Id, A>>
      })
    )

    return {
      Config,
      Provisioning: ProvisioningKey,
      layer,
      managed: <N, Instant = number>(options: {
        readonly subjects: SubjectOptions<T, N>
        readonly tables?: Partial<Record<Roles<C, Id, A>, T>>
        readonly prefix?: string
        readonly timestamps?: {
          readonly type: "text" | "integer"
          readonly codec: Schema.Codec<number, Instant>
        }
      }) => layout(options, true),
      map: <N, Instant = number>(options: {
        readonly subjects: SubjectOptions<T, N>
        readonly tables: Partial<Record<StorageRole, T>>
        readonly timestamps?: {
          readonly type: "text" | "integer"
          readonly codec: Schema.Codec<number, Instant>
        }
      }) => layout(options, false)
    }
  }

  return { make }
}
