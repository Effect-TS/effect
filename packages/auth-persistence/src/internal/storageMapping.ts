import { EmailCredentialSnapshot } from "@effect/auth/Email"
import { LoginIdentifier } from "@effect/auth/Identity"
import { EncodedPasswordHash, PasswordCredentialSnapshot, type PasswordReplacement } from "@effect/auth/Password"
import { TokenDigest } from "@effect/auth/Schema"
import {
  AuthenticationEvidence,
  SecurityRevision,
  SessionAuthenticationProvenance,
  SessionCredentialVersion,
  SessionId,
  SessionMetadata,
  type StatefulSessionRecord
} from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import * as Struct from "effect/Struct"

import type { MappingInput } from "./configuration.ts"
import { randomId } from "./crypto.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import { type AnyEmailAddressMapping, requiredEmailAddressConstraints } from "./models/emailModel.ts"
import { type AnyPasswordPersistenceMapping, requiredPasswordConstraints } from "./models/passwordModel.ts"
import { type AnyProofPersistenceMapping, requiredProofConstraints } from "./models/proofModel.ts"
import type { PendingAuthenticationMapping, StatefulSessionMapping } from "./models/sessionModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { exactSqlText } from "./sqlChange.ts"
import { makeStorageClock } from "./storageClock.ts"
import { type StorageRole, storageTables } from "./storageTables.ts"
import type { SqlExpression, TableModel } from "./tableModel.ts"

const failure = (cause: unknown) => PersistenceMappingError.make({ operation: "decode", cause })

const decode = <S extends Schema.Codec<unknown, unknown>>(schema: S, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, failure)))
  )

const string = (value: unknown) => Schema.decodeUnknownSync(Schema.String)(value)

/** Derive shared row mappings from a managed or custom storage layout.
 * Acquire SecureRandom once; the returned allocators retain that implementation.
 * Each factory returns an Effect that fails with PersistenceMappingError when
 * its role tables are missing. Supplying native tables derives
 * batch commit predicates and subject policy columns. Adapter authors may refine
 * clocks and authority policy for explicit services.
 */
export const makeMappings = Effect.fnUntraced(function*(
  input: MappingInput,
  tables?: NativeSqlTables
) {
  const random = yield* SecureRandom.SecureRandom
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()

  const allocate = randomId.pipe(
    Effect.provideService(SecureRandom.SecureRandom, random),
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, failure)))
  )

  const table = Effect.fnUntraced(function*(role: StorageRole) {
    const found = input.tables[role]

    if (found === undefined) return yield* failure(`Missing ${role} mapping`)

    return found
  })

  const mapped = Effect.fnUntraced(function*(role: StorageRole) {
    return {
      table: yield* table(role),
      ...Object.fromEntries(Object.keys(storageTables[role].columns).map((key) => [key, key]))
    }
  })

  const { subjects: s, encodeInstant: instant, decodeInstant: readInstant } = input
  const subjectId = { toNative: s.toNative, toSubject: s.toSubject, equals: Object.is }
  const identifierTable = tables?.(yield* table("identifiers"))

  const activeIdentifier = identifierTable === undefined
    ? undefined
    : sql`${identifierTable.column("active")} = ${identifierTable.value("active", true)}`

  const subject = {
    table: s.table,
    id: s.id,
    status: s.status,
    securityRevision: s.securityRevision,
    // Policy callbacks may read any application column. Identity, status and
    // security revision have their own final checks and can be intentionally revised.
    ...(tables === undefined
      ? {}
      : {
        requirementColumns: tables(s.table).keys.filter(
          (key) => key !== s.id && key !== s.status && key !== s.securityRevision
        )
      }),
    isActiveStatus: (value: unknown) => Object.is(value, s.activeValue),
    d1ActiveStatusValue: s.activeValue,
    activeStatusValue: s.activeValue,
    decodeRequirement: s.requirements,
    decodeActionRequirement: s.actionRequirements,
    nextSecurityRevision: () => allocate.pipe(Effect.map(SecurityRevision.make))
  }

  const authorityCredential = Effect.fnUntraced(function*() {
    return {
      ...(yield* mapped("credentials")),
      subjectId: "subjectId",
      credentialId: "credentialId",
      revision: "revision",
      status: "active",
      activeStatusValue: true,
      d1ActiveStatusValue: true,
      isActiveStatus: (value: unknown) => value === true,
      encodeInsert: (row: object) => ({ ...row, active: true }),
      encodeRevision: (revision: SecurityRevision) => ({ revision })
    }
  })

  const authority = Effect.fnUntraced(function*() {
    return { subjectId, subject, credential: yield* authorityCredential() }
  })

  const clock = yield* makeStorageClock(input)

  const proofs = Effect.fnUntraced(function*(): Effect.fn.Return<
    AnyProofPersistenceMapping<SqlExpression>,
    PersistenceMappingError
  > {
    return {
      constraints: requiredProofConstraints,
      subjectId,
      subject: { table: s.table, id: s.id },
      clock,
      proof: {
        ...(yield* mapped("proofs")),
        moduleId: "moduleId",
        purpose: "purpose",
        seriesKey: "seriesKey",
        proofId: "proofId",
        binding: "binding",
        verifierKeyId: "verifierKeyId",
        verifierDigest: "verifierDigest",
        issuedAt: "issuedAt",
        expiresAt: "expiresAt",
        failedAttempts: "failedAttempts",
        encodeInsert: () => ({})
      }
    }
  })

  const passwords = Effect.fnUntraced(function*(): Effect.fn.Return<
    AnyPasswordPersistenceMapping<SqlExpression>,
    PersistenceMappingError
  > {
    const verifier = (replacement: PasswordReplacement) => ({
      verifier: Redacted.value(replacement.verifier),
      normalization: replacement.normalization
    })

    return {
      subjectId,
      subject,
      authorityCredential: yield* authorityCredential(),
      constraints: requiredPasswordConstraints,
      encodeInstant: instant,
      decodeInstant: readInstant,
      allocateCredentialId: allocate,
      allocateRevision: allocate.pipe(Effect.map(SecurityRevision.make)),
      sessionInvalidation: "same-authority-immediate",
      identifier: {
        table: yield* table("identifiers"),
        namespace: "namespace",
        value: "value",
        subjectId: "subjectId",
        verifiedAt: "verifiedAt",
        bindingRevision: "revision",
        isCurrent: (row) => row.active === true,
        ...(activeIdentifier === undefined
          ? {}
          : {
            d1CurrentCondition: () => activeIdentifier
          }),
        encodeInitialInsert: (identifier, subjectId, revision) => ({
          ...identifier,
          subjectId,
          revision,
          verifiedAt: null,
          active: true
        })
      },
      credential: {
        ...(yield* mapped("passwords")),
        moduleId: "moduleId",
        subjectId: "subjectId",
        credentialId: "credentialId",
        credentialRevision: "credentialRevision",
        verifierVersion: "verifierVersion",
        verifier: "verifier",
        normalization: "normalization",
        encodeInsert: ({ replacement, ...row }) => ({ ...row, ...verifier(replacement) }),
        encodeVerifier: (hash, verifierVersion) => ({
          verifier: Redacted.value(hash),
          verifierVersion
        }),
        encodeReplacement: ({ replacement, ...row }) => ({ ...row, ...verifier(replacement) }),
        decode: Effect.fnUntraced(function*({ moduleId, subject: row, identifier, credential }) {
          const id = yield* s.toSubject(row[s.id])
          const hash = yield* decode(EncodedPasswordHash, credential.verifier)

          return yield* decode(PasswordCredentialSnapshot, {
            moduleId,
            revision: {
              subjectId: id,
              securityRevision: row[s.securityRevision],
              credentials: [
                {
                  credentialId: credential.credentialId,
                  revision: credential.credentialRevision
                }
              ]
            },
            credentialId: credential.credentialId,
            credentialRevision: credential.credentialRevision,
            verifierVersion: credential.verifierVersion,
            verifier: hash,
            normalization: credential.normalization,
            identifier: yield* decode(LoginIdentifier, {
              namespace: identifier.namespace,
              value: identifier.value
            }),
            identifierBindingRevision: identifier.revision,
            ...(identifier.verifiedAt === null
              ? {}
              : { identifierVerifiedAtMillis: yield* readInstant(identifier.verifiedAt) })
          })
        })
      },
      clock
    }
  })

  const emails = Effect.fnUntraced(function*(): Effect.fn.Return<
    AnyEmailAddressMapping<SqlExpression>,
    PersistenceMappingError
  > {
    return {
      subjectId,
      subject: { ...subject, activeStatusValue: s.activeValue },
      constraints: requiredEmailAddressConstraints,
      addressCardinality: "single",
      changeDisposition: "retire-source",
      clock,
      encodeInstant: instant,
      decodeInstant: readInstant,
      allocateCredentialId: allocate,
      allocateRevision: allocate.pipe(Effect.map(SecurityRevision.make)),
      sessionInvalidation: "same-authority-immediate",
      isIdentifierConflict: () => false,
      isCredentialConflict: () => false,
      authorityCredential: {
        ...(yield* authorityCredential()),
        encodeActivation: (revision) => ({ revision, active: true }),
        encodeRetirement: (revision) => ({ revision, active: false })
      },
      identifier: {
        table: yield* table("identifiers"),
        namespace: "namespace",
        value: "value",
        subjectId: "subjectId",
        verifiedAt: "verifiedAt",
        bindingRevision: "revision",
        isCurrent: (row) => row.active === true && row.verifiedAt !== null,
        isMutableTarget: (row) => row.active === true && row.verifiedAt === null,
        ...(identifierTable === undefined || activeIdentifier === undefined
          ? {}
          : {
            d1CurrentCondition: ({ bindingRevision }) =>
              sql`${activeIdentifier} and ${identifierTable.column("verifiedAt")} is not null and ${
                exactSqlText(
                  sql,
                  identifierTable.column("revision"),
                  identifierTable.value("revision", bindingRevision)
                )
              }`,
            d1MutableTargetCondition: () => sql`${activeIdentifier} and ${identifierTable.column("verifiedAt")} is null`
          }),
        encodeVerifiedInsert: ({ identifier, subjectId, verifiedAtMillis, bindingRevision }) => ({
          ...identifier,
          subjectId,
          verifiedAt: instant(verifiedAtMillis),
          revision: bindingRevision,
          active: true
        }),
        encodeVerification: ({ verifiedAtMillis, bindingRevision }) => ({
          verifiedAt: instant(verifiedAtMillis),
          revision: bindingRevision,
          active: true
        }),
        encodeRetirement: ({ bindingRevision }) => ({ revision: bindingRevision, active: false })
      },
      credential: {
        activeStatusValue: true,
        table: yield* table("emailCredentials"),
        moduleId: "moduleId",
        subjectId: "subjectId",
        credentialId: "credentialId",
        identifierNamespace: "identifierNamespace",
        identifierValue: "identifierValue",
        credentialRevision: "credentialRevision",
        status: "active",
        isActiveStatus: (value) => value === true,
        encodeVerifiedInsert: ({ identifier, ...row }) => ({
          ...row,
          identifierNamespace: identifier.namespace,
          identifierValue: identifier.value,
          active: true
        }),
        encodeActivation: ({ identifier, credentialRevision }) => ({
          identifierNamespace: identifier.namespace,
          identifierValue: identifier.value,
          credentialRevision,
          active: true
        }),
        encodeRetirement: ({ credentialRevision }) => ({ credentialRevision, active: false }),
        decode: Effect.fnUntraced(function*({ moduleId, subject: row, identifier, credential }) {
          return yield* decode(
            Schema.Struct(Struct.omit(EmailCredentialSnapshot.fields, ["requirement"])),
            {
              moduleId,
              identifier: { namespace: identifier.namespace, value: identifier.value },
              identifierRevision: identifier.revision,
              verifiedAtMillis: yield* readInstant(identifier.verifiedAt),
              credentialId: credential.credentialId,
              credentialRevision: credential.credentialRevision,
              revision: {
                subjectId: yield* s.toSubject(row[s.id]),
                securityRevision: row[s.securityRevision],
                credentials: [
                  {
                    credentialId: credential.credentialId,
                    revision: credential.credentialRevision
                  }
                ]
              }
            }
          )
        })
      }
    }
  })

  const pending = Effect.fnUntraced(function*<
    C extends Schema.Codec<unknown, unknown, never, never>
  >(
    claims: C,
    moduleId: string
  ): Effect.fn.Return<
    PendingAuthenticationMapping<C["Type"], TableModel, TableModel, TableModel, unknown>,
    PersistenceMappingError
  > {
    const record = Schema.fromJsonString(
      Schema.Struct({
        digest: TokenDigest,
        version: SecurityRevision,
        evidence: AuthenticationEvidence,
        expiresAt: Schema.DateTimeUtcFromMillis,
        attemptLimit: Schema.Int.check(Schema.isGreaterThan(0)),
        claims: Schema.Unknown
      })
    )

    return {
      ...(yield* authority()),
      moduleId,
      clock,
      isConstraintConflict: () => false,
      constraints: { pendingDigest: "unique(pending.digest)" },
      pending: {
        table: yield* table("pending"),
        moduleId: "moduleId",
        kind: "kind",
        digest: "digest",
        version: "version",
        flowId: "flowId",
        subjectId: "subjectId",
        bindingDigest: "bindingDigest",
        snapshot: "snapshot",
        expiresAt: "expiresAt",
        attemptLimit: "attemptLimit",
        failedAttempts: "failedAttempts",
        consumed: "consumed",
        encodeInstant: (date) => instant(DateTime.toEpochMillis(date)),
        allocateVersion: allocate.pipe(Effect.map(SecurityRevision.make)),
        encodeInsert: (value) => ({
          ...value,
          expiresAt: instant(DateTime.toEpochMillis(value.expiresAt)),
          failedAttempts: 0,
          consumed: false
        })
      },
      login: {
        encode: (value) =>
          Schema.encodeEffect(claims)(value.claims).pipe(
            Effect.flatMap((saved) => Schema.encodeEffect(record)({ ...value, claims: saved })),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, failure)))
          ),
        decode: (value) =>
          decode(record, value).pipe(
            Effect.flatMap((saved) =>
              decode(claims, saved.claims).pipe(
                Effect.map((decoded) => ({ ...saved, claims: decoded }))
              )
            )
          )
      }
    }
  })

  const sessions = Effect.fnUntraced(function*<
    C extends Schema.Codec<unknown, unknown, never, never>
  >(
    claims: C,
    moduleId: string
  ): Effect.fn.Return<
    StatefulSessionMapping<
      C["Type"],
      TableModel,
      TableModel,
      TableModel,
      TableModel,
      unknown,
      unknown
    >,
    PersistenceMappingError
  > {
    const record = Schema.fromJsonString(
      Schema.Struct({
        ...SessionMetadata.fields,
        claims: Schema.Unknown,
        digest: TokenDigest,
        provenance: SessionAuthenticationProvenance,
        credentialVersion: SessionCredentialVersion
      })
    )

    const encodeRow = (value: StatefulSessionRecord<C["Type"]>) => ({
      digest: value.digest,
      securityRevision: value.securityRevision,
      issuedAt: instant(DateTime.toEpochMillis(value.issuedAt)),
      expiresAt: instant(DateTime.toEpochMillis(value.expiresAt)),
      absoluteExpiresAt: instant(DateTime.toEpochMillis(value.absoluteExpiresAt)),
      record: Schema.encodeSync(record)({
        ...value,
        claims: Schema.encodeSync(claims)(value.claims)
      })
    })

    const login = yield* pending(claims, moduleId)

    return {
      ...(yield* authority()),
      moduleId,
      clock,
      isConstraintConflict: () => false,
      pending: { pending: login.pending, login: login.login },
      constraints: {
        sessionDigest: "unique(session.digest)",
        pendingDigest: "unique(pending.digest)"
      },
      sessionId: {
        toNative: (id) => Effect.succeed(id),
        toSession: (id) => decode(SessionId, id),
        equals: Object.is
      },
      session: {
        table: yield* table("sessions"),
        sessionId: "sessionId",
        subjectId: "subjectId",
        digest: "digest",
        securityRevision: "securityRevision",
        issuedAt: "issuedAt",
        expiresAt: "expiresAt",
        absoluteExpiresAt: "absoluteExpiresAt",
        encodeInstant: (date) => instant(DateTime.toEpochMillis(date)),
        allocateId: allocate,
        encodeInsert: (value, ids) => ({ ...encodeRow(value), ...ids }),
        encodeRotation: encodeRow,
        decode: Effect.fnUntraced(function*(row) {
          const saved = yield* decode(record, row.record),
            decodedClaims = yield* decode(claims, saved.claims)

          return {
            ...saved,
            issuedAt: DateTime.makeUnsafe(yield* readInstant(row.issuedAt)),
            claims: decodedClaims
          }
        })
      }
    }
  })

  return { table, authority, proofs, passwords, emails, sessions, pending, string }
})
