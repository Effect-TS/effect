import * as Passkey from "@effect/auth/Passkey"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { type MappingInput, type PasskeyFeature, PersistenceConfigurationError } from "./configuration.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import { requiredPasskeyCredentialConstraints, requiredPasskeyPersistenceConstraints } from "./models/passkeyModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { makeBatchPasskeyServices, makeNativePasskeyServices } from "./passkeyNative.ts"
import type { PasskeyNativeMapping, PasskeyNativeRead } from "./passkeyNativeState.ts"
import { makePasskeyNativeManagement, type NativePasskeyManagementMapping } from "./passkeyNativeWrite.ts"
import { anySqlCondition } from "./sqlChange.ts"
import { SqlBatchCommit } from "./sqlCommit.ts"
import { type StorageRole, storageTables } from "./storageTables.ts"

/** @internal */
export interface ComposedPasskeyInput {
  readonly storage: MappingInput
  readonly namespace: string
  readonly dialect: "pg" | "sqlite"
  readonly features: ReadonlyArray<PasskeyFeature>
  readonly passwordModules: ReadonlyArray<string>
}

const profileJson = Schema.fromJsonString(Passkey.PasskeyProfile)

const credentialData = Passkey.PasskeyCredential.mapFields(
  ({ revision: _revision, active: _active, requirement: _requirement, ...fields }) => fields
)

const configurationError = (reason: string) => PersistenceConfigurationError.make({ reason })

const mappings = Effect.fnUntraced(function*(
  storage: MappingInput,
  tables: NativeSqlTables,
  passwordModules: ReadonlyArray<string>,
  signInProfiles: ReadonlyArray<Passkey.PasskeyProfile>
) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()

  const table = Effect.fnUntraced(function*(role: StorageRole) {
    const value = storage.tables[role]

    if (value === undefined) return yield* configurationError(`Missing ${role} mapping`)

    return value
  })

  const mapped = Effect.fnUntraced(function*<Role extends StorageRole>(role: Role) {
    return {
      table: yield* table(role),
      // Managed storage validation owns these physical column keys.
      ...(Object.fromEntries(Object.keys(storageTables[role].columns).map((key) => [key, key])) as {
        readonly [Key in keyof (typeof storageTables)[Role]["columns"]]: Key
      })
    }
  })

  const t = Effect.fnUntraced(function*(role: StorageRole) {
    return tables(yield* table(role))
  })

  const eq = Effect.fnUntraced(function*(role: StorageRole, key: string, value: unknown) {
    const table = yield* t(role)

    return sql`${table.column(key)} = ${table.value(key, value)}`
  })

  const s = storage.subjects
  const subject = tables(s.table)
  const active = (value: unknown) => value === true

  const read: PasskeyNativeRead = {
    subject: {
      table: s.table,
      id: s.id,
      status: s.status,
      securityRevision: s.securityRevision,
      decodeId: (row) => row[s.id],
      decodeRequirement: s.requirements,
      isActiveStatus: (value) => Object.is(value, s.activeValue),
      activeCondition: sql`${subject.column(s.status)} = ${subject.value(s.status, s.activeValue)}`
    },
    credential: {
      ...(yield* mapped("passkeyCredentials")),
      status: "active",
      decode: (row) =>
        Schema.decodeUnknownSync(credentialData)({
          ...row,
          profile: Schema.decodeUnknownSync(profileJson)(row.profile)
        }),
      decodeSubjectId: (row) => row.subjectId,
      isActiveStatus: active,
      activeCondition: yield* eq("passkeyCredentials", "active", true)
    },
    authority: {
      ...(yield* mapped("credentials")),
      status: "active",
      isActiveStatus: active,
      activeCondition: yield* eq("credentials", "active", true)
    },
    subjectIds: { toNative: s.toNativeSync, toSubject: s.toSubjectSync, equals: Object.is },
    constraints: requiredPasskeyCredentialConstraints
  }

  const base = Effect.fnUntraced(function*(
    feature: PasskeyFeature
  ): Effect.fn.Return<PasskeyNativeMapping, PersistenceConfigurationError> {
    return {
      moduleId: feature.moduleId,
      read,
      flow: { ...(yield* mapped("passkeyFlows")), encodeInsert: () => ({}) },
      clock: {
        encodeInstant: storage.encodeInstant,
        decodeInstant: storage.decodeInstantSync,
        engineNowMillis: sql.onDialectOrElse({
          pg: () => sql`cast(extract(epoch from clock_timestamp()) * 1000 as bigint)`,
          orElse: () => sql`cast(round((julianday('now') - 2440587.5) * 86400000) as integer)`
        }),
        toMillis: (expression: Fragment) => expression,
        fromMillis: (expression: Fragment) => expression
      },
      telemetry: {
        lastUsedAt: "lastUsedAt",
        encodeBackupEligible: (value) => value,
        encodeBackupState: (value) => value
      },
      constraints: requiredPasskeyPersistenceConstraints
    }
  })

  const metadata = (nativeId: unknown) =>
    sql`exists(select 1 from ${subject.name} where ${subject.column(s.id)} = ${subject.value(s.id, nativeId)} and ${
      subject.column(s.status)
    } = ${subject.value(s.status, s.activeValue)})`

  const management = Effect.fnUntraced(function*(
    feature: PasskeyFeature
  ): Effect.fn.Return<NativePasskeyManagementMapping, PersistenceConfigurationError> {
    const policy = feature.managementPolicy

    if (policy === undefined) {
      return yield* configurationError(`Missing passkey management policy for ${feature.moduleId}`)
    }

    const c = yield* t("passkeyCredentials"),
      f = yield* t("credentials")

    return {
      ...(yield* base(feature)),
      write: {
        credential: {
          name: "name",
          createdAt: "createdAt",
          encodeInsert: ({ credential, subjectId, summary, marker }) => ({
            credentialId: credential.credentialId,
            subjectId,
            rpId: credential.rpId,
            protocolCredentialId: credential.protocolCredentialId,
            userHandle: credential.userHandle,
            credentialKey: "",
            publicKey: credential.publicKey,
            algorithm: credential.algorithm,
            profile: Schema.encodeSync(profileJson)(credential.profile),
            credentialRevision: marker,
            active: true,
            primarySignIn: credential.primarySignIn,
            enrollmentUserVerified: credential.enrollmentUserVerified,
            backupEligible: credential.backupEligible,
            backupState: credential.backupState,
            counter: credential.counter,
            name: summary.name,
            createdAt: storage.encodeInstant(summary.createdAtMillis)
          }),
          encodePrimarySignIn: (value) => value,
          encodeEnrollmentUserVerified: (value) => value,
          encodeBackupEligible: (value) => value,
          activeStatus: true,
          removedStatus: false
        },
        authority: {
          encodeInsert: ({ subjectId, credential, marker }) => ({
            subjectId,
            credentialId: credential.credentialId,
            revision: marker,
            active: true
          }),
          activeStatus: true,
          removedStatus: false
        },
        policy: {
          subjectColumns: subject.keys,
          management: () => policy,
          requirement: s.actionRequirements,
          metadata,
          action: metadata,
          remainingSignIn: Effect.fnUntraced(
            function*(nativeId, excluded, row) {
              const requirement = yield* Schema.decodeEffect(Passkey.PasskeyRequirement)(
                yield* s.requirements(row)
              )

              const alternatives: Array<Fragment> = []

              if (
                requirement.alternatives.some(
                  (alternative) =>
                    alternative.minimumCredentials === 1 &&
                    alternative.factors.every((factor) => factor === "possession")
                )
              ) {
                alternatives.push(
                  sql`exists(select 1 from ${c.name} join ${f.name} on ${f.column("credentialId")} = ${
                    c.column("credentialId")
                  } and ${f.column("subjectId")} = ${f.value("subjectId", nativeId)} and ${f.column("revision")} = ${
                    c.column("credentialRevision")
                  } and ${yield* eq("credentials", "active", true)}
                where ${yield* eq("passkeyCredentials", "subjectId", nativeId)} and ${c.column("credentialId")} <> ${
                    c.value("credentialId", excluded)
                  } and ${yield* eq("passkeyCredentials", "active", true)} and ${yield* eq(
                    "passkeyCredentials",
                    "primarySignIn",
                    true
                  )} and ${yield* eq("passkeyCredentials", "enrollmentUserVerified", true)} and ${
                    anySqlCondition(
                      yield* Effect.forEach(signInProfiles, (profile) => eq("passkeyCredentials", "rpId", profile.rpId))
                    )
                  })`
                )
              }
              if (
                passwordModules.length > 0 &&
                requirement.alternatives.some(
                  (alternative) =>
                    alternative.minimumCredentials === 1 &&
                    !alternative.userVerified &&
                    !alternative.phishingResistant &&
                    alternative.factors.every((factor) => factor === "knowledge")
                )
              ) {
                const p = yield* t("passwords"),
                  i = yield* t("identifiers")

                alternatives.push(
                  sql`exists(select 1 from ${p.name} join ${f.name} on ${f.column("credentialId")} = ${
                    p.column("credentialId")
                  } and ${f.column("subjectId")} = ${f.value("subjectId", nativeId)} and ${f.column("revision")} = ${
                    p.column("credentialRevision")
                  } and ${yield* eq("credentials", "active", true)}
                join ${i.name} on ${yield* eq("identifiers", "subjectId", nativeId)} and ${yield* eq(
                    "identifiers",
                    "active",
                    true
                  )} and ${yield* eq("identifiers", "namespace", "email")}
                where ${yield* eq("passwords", "subjectId", nativeId)} and ${p.column("credentialId")} <> ${
                    p.value("credentialId", excluded)
                  } and ${
                    anySqlCondition(
                      yield* Effect.forEach(passwordModules, (module) => eq("passwords", "moduleId", module))
                    )
                  })`
                )
              }

              return anySqlCondition(alternatives)
            },
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "mapping", cause: error }))
              )
            )
          )
        }
      },
      invalidation: {
        window: {
          trigger: "credential-change",
          existingSessions: "immediate",
          maximumExposureMillis: 0,
          oldAuthenticationEvidence: "rejected"
        },
        mutations: [],
        postcondition: ({ subjectId, securityRevision }) =>
          sql`exists(select 1 from ${subject.name} where ${subject.column(s.id)} = ${
            subject.value(s.id, subjectId)
          } and ${subject.column(s.securityRevision)} = ${subject.value(s.securityRevision, securityRevision)})`
      }
    }
  })

  return { base, management }
})

/**
 * Managed and mapped tables feed the same native passkey statements.
 *
 * @internal
 */
export const makeManagedPasskeys = Effect.fnUntraced(
  function*(input: ComposedPasskeyInput, tables: NativeSqlTables) {
    const batch = yield* SqlBatchCommit

    const policies = yield* Effect.forEach(
      input.features,
      (feature) => Effect.map(feature.policy, (policy) => ({ feature, policy }))
    )

    const mapping = yield* mappings(
      input.storage,
      tables,
      input.passwordModules,
      policies.flatMap(({ feature, policy }) => (feature.management ? [] : policy.profiles))
    )

    const services = new Map<
      string,
      Effect.Success<ReturnType<typeof makeNativePasskeyServices>>
    >()

    const managers = new Map<string, Passkey.PasskeyManagementPersistence["Service"]>()

    for (const feature of input.features) {
      const selected = feature.management
        ? yield* mapping.management(feature)
        : yield* mapping.base(feature)

      const base = yield* batch === undefined
        ? makeNativePasskeyServices(tables, selected)
        : makeBatchPasskeyServices(tables, selected)

      services.set(feature.moduleId, base)
      if (feature.management) {
        managers.set(
          feature.moduleId,
          makePasskeyNativeManagement(base, yield* mapping.management(feature))
            .passkeyManagementPersistence
        )
      }
    }

    const service = (moduleId: string) => {
      const value = services.get(moduleId)

      return value === undefined
        ? Effect.fail(Passkey.PasskeyUnavailable.make({}))
        : Effect.succeed(value)
    }

    const manager = (moduleId: string) => {
      const value = managers.get(moduleId)

      return value === undefined
        ? Effect.fail(Passkey.PasskeyUnavailable.make({}))
        : Effect.succeed(value)
    }

    const first = services.values().next().value

    if (first === undefined) return yield* configurationError("A passkey module is required")

    let context: Context.Context<never> = Context.make(Passkey.PasskeyCredentials, {
      lookup: (input) => first.passkeyCredentials.lookup(input),
      listForSubject: (input) =>
        Effect.flatMap(service(input.moduleId), (value) => value.passkeyCredentials.listForSubject(input))
    }).pipe(
      Context.add(Passkey.PasskeyPersistence, {
        issue: (input, prepare) =>
          Effect.flatMap(service(input.ceremony.moduleId), (value) => value.passkeyPersistence.issue(input, prepare)),
        context: (input) => Effect.flatMap(service(input.moduleId), (value) => value.passkeyPersistence.context(input)),
        consume: (input, prepare) =>
          Effect.flatMap(service(input.access.moduleId), (value) => value.passkeyPersistence.consume(input, prepare)),
        cleanup: (input, prepare) =>
          Effect.flatMap(service(input.moduleId), (value) => value.passkeyPersistence.cleanup(input, prepare))
      })
    )

    if (managers.size > 0) {
      context = context.pipe(
        Context.add(Passkey.PasskeyManagementPersistence, {
          completeEnrollment: (input, prepare) =>
            Effect.flatMap(manager(input.ceremony.moduleId), (value) => value.completeEnrollment(input, prepare)),
          list: (input) => Effect.flatMap(manager(input.moduleId), (value) => value.list(input)),
          inspectRemove: (input) => Effect.flatMap(manager(input.moduleId), (value) => value.inspectRemove(input)),
          rename: (input, prepare) => Effect.flatMap(manager(input.moduleId), (value) => value.rename(input, prepare)),
          remove: (input, prepare) => Effect.flatMap(manager(input.moduleId), (value) => value.remove(input, prepare))
        })
      )
    }

    return context
  },
  (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
  Effect.catchCause((cause) =>
    Effect.failCause(
      Cause.map(cause, (error) =>
        Schema.is(PersistenceConfigurationError)(error)
          ? error
          : configurationError("Unable to configure passkey persistence"))
    )
  )
)
