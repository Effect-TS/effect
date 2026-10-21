import { CurrentCommitJournal, hasCommitScope } from "@effect/auth/Hooks"
import type { LoginIdentifier } from "@effect/auth/Identity"
import {
  EncodedPasswordHash,
  type PasswordCredentialSnapshot,
  type PasswordPersistence,
  PasswordUnavailable,
  snapshotPasswordCredential
} from "@effect/auth/Password"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import { SecurityRevision } from "@effect/auth/Sessions"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyPasswordPersistenceMapping } from "./models/passwordModel.ts"
import { sqlMapping, type SqlTable } from "./nativeSqlTable.ts"
import type { PasswordWorkflowOptions } from "./passwordPolicy.ts"

type Row = Readonly<Record<string, unknown>>
const unavailable = () => PasswordUnavailable.make({})

const failure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  reportPersistenceFailure(effect, Schema.is(PasswordUnavailable), { markReported: true }).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
  )

/** @internal */
export const samePasswordCredentialSnapshot = (
  a: PasswordCredentialSnapshot,
  b: PasswordCredentialSnapshot
) =>
  a.moduleId === b.moduleId &&
  a.revision.subjectId === b.revision.subjectId &&
  a.revision.securityRevision === b.revision.securityRevision &&
  a.revision.credentials.length === b.revision.credentials.length &&
  new Set(a.revision.credentials.map((entry) => entry.credentialId)).size ===
    a.revision.credentials.length &&
  new Set(b.revision.credentials.map((entry) => entry.credentialId)).size ===
    b.revision.credentials.length &&
  a.revision.credentials.every((entry) =>
    b.revision.credentials.some(
      (other) => entry.credentialId === other.credentialId && entry.revision === other.revision
    )
  ) &&
  a.credentialId === b.credentialId &&
  a.credentialRevision === b.credentialRevision &&
  a.verifierVersion === b.verifierVersion &&
  Redacted.value(a.verifier) === Redacted.value(b.verifier) &&
  a.normalization === b.normalization &&
  a.identifier.namespace === b.identifier.namespace &&
  a.identifier.value === b.identifier.value &&
  a.identifierBindingRevision === b.identifierBindingRevision &&
  a.identifierVerifiedAtMillis === b.identifierVerifiedAtMillis

/**
 * Lookup is read-only; rehash is one conditional maintenance write, never authentication.
 *
 * @internal
 */
export const makePasswordCredentials = Effect.fnUntraced(function*(
  table: (table: object) => SqlTable,
  mapping: AnyPasswordPersistenceMapping,
  options: PasswordWorkflowOptions
): Effect.fn.Return<
  Pick<PasswordPersistence["Service"], "findCredential" | "rehashIfCurrent">,
  PasswordUnavailable,
  SqlClient.SqlClient
> {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const parent = yield* Effect.serviceOption(CurrentCommitJournal)

  const [s, i, c, a] = yield* sqlMapping(
    () =>
      [
        table(mapping.subject.table),
        table(mapping.identifier.table),
        table(mapping.credential.table),
        table(mapping.authorityCredential.table)
      ] as const
  ).pipe(failure)

  const standalone = Effect.gen(function*() {
    if (options.coordinated) {
      const current = yield* Effect.serviceOption(CurrentCommitJournal)

      if (Option.isNone(parent) || Option.isNone(current) || parent.value !== current.value) {
        return yield* unavailable()
      }
    } else {
      if (yield* hasCommitScope) return yield* unavailable()
      yield* options.standaloneGuard
    }
  })

  const allocate = <A>(
    asynchronous: Effect.Effect<A, PersistenceMappingError> | undefined,
    sync: (() => A) | undefined
  ) => {
    if (options.mode !== "synchronous" && asynchronous !== undefined) return asynchronous

    return sync === undefined
      ? Effect.fail(unavailable())
      : Effect.try({ try: sync, catch: unavailable })
  }

  // Bind each native ID through its own column codec. Physical encodings of the
  // same application ID need not match across subject, identifier and password.
  const snapshot = Effect.fnUntraced(function*(
    nativeId: unknown,
    moduleId: string,
    identifier: LoginIdentifier
  ) {
    const subjectTable = s.as("password_subject")
    const identifierTable = i.as("password_identifier")
    const credentialTable = c.as("password_credential")
    const authorityTable = a.as("password_authority")
    const authority = mapping.authorityCredential

    const rows = yield* sqlMapping(
      () =>
        sql<Row>`select ${subjectTable.fields("subject_")}, ${identifierTable.fields("identifier_")}, ${
          credentialTable.fields("credential_")
        }, ${authorityTable.fields("authority_")}
      from ${subjectTable.name}
      inner join ${identifierTable.name} on ${identifierTable.column(mapping.identifier.namespace)} = ${
          identifierTable.value(mapping.identifier.namespace, identifier.namespace)
        }
        and ${identifierTable.column(mapping.identifier.value)} = ${
          identifierTable.value(mapping.identifier.value, identifier.value)
        }
        and ${identifierTable.column(mapping.identifier.subjectId)} = ${
          identifierTable.value(mapping.identifier.subjectId, nativeId)
        }
      inner join ${credentialTable.name} on ${credentialTable.column(mapping.credential.moduleId)} = ${
          credentialTable.value(mapping.credential.moduleId, moduleId)
        }
        and ${credentialTable.column(mapping.credential.subjectId)} = ${
          credentialTable.value(mapping.credential.subjectId, nativeId)
        }
      left join ${authorityTable.name} on ${authorityTable.column(authority.subjectId)} = ${
          authorityTable.value(authority.subjectId, nativeId)
        }
        ${
          authority.status === undefined || authority.d1ActiveStatusValue === undefined
            ? sql``
            : sql`and ${authorityTable.column(authority.status)} = ${
              authorityTable.value(authority.status, authority.d1ActiveStatusValue)
            }`
        }
      where ${subjectTable.column(mapping.subject.id)} = ${subjectTable.value(mapping.subject.id, nativeId)} order by ${
          authorityTable.column(authority.credentialId)
        } limit 4097
      `
    ).pipe(Effect.flatten)

    if (rows.length === 0) return undefined
    if (rows.length > 4096) return yield* unavailable()

    const [subject, identifierRow, credential] = yield* sqlMapping(
      () =>
        [
          s.decode(rows[0]!, "subject_"),
          i.decode(rows[0]!, "identifier_"),
          c.decode(rows[0]!, "credential_")
        ] as const
    )

    if (
      yield* sqlMapping(
        () =>
          !mapping.subject.isActiveStatus(subject[mapping.subject.status]) ||
          !mapping.identifier.isCurrent(identifierRow) ||
          !mapping.subjectId.equals(nativeId, identifierRow[mapping.identifier.subjectId]) ||
          !mapping.subjectId.equals(nativeId, subject[mapping.subject.id]) ||
          !mapping.subjectId.equals(nativeId, credential[mapping.credential.subjectId])
      )
    ) {
      return undefined
    }

    const captured = yield* sqlMapping(() =>
      mapping.credential.decode({ moduleId, subject, identifier: identifierRow, credential })
    ).pipe(Effect.flatten, Effect.flatMap(snapshotPasswordCredential))

    const factors = new Map<string, SecurityRevision>()

    for (const row of rows) {
      const factor = yield* sqlMapping(() => a.decode(row, "authority_"))

      if (factor[authority.credentialId] === null || factor[authority.credentialId] === undefined) {
        continue
      }
      if (!mapping.subjectId.equals(nativeId, factor[authority.subjectId])) {
        return yield* unavailable()
      }
      if (
        authority.status !== undefined &&
        authority.isActiveStatus?.(factor[authority.status]) !== true
      ) {
        continue
      }

      const credentialId = yield* Schema.decodeUnknownEffect(Schema.String)(
        factor[authority.credentialId]
      )

      const revision = yield* Schema.decodeUnknownEffect(SecurityRevision)(
        factor[authority.revision]
      )

      if (factors.has(credentialId)) return yield* unavailable()
      factors.set(credentialId, revision)
    }
    if (factors.size > 64 || factors.get(captured.credentialId) !== captured.credentialRevision) {
      return undefined
    }

    return yield* snapshotPasswordCredential({
      ...captured,
      revision: {
        ...captured.revision,
        credentials: [...factors].map(([credentialId, revision]) => ({ credentialId, revision }))
      }
    })
  })

  return {
    findCredential: Effect.fnUntraced(function*(uncaptured) {
      const input = { ...uncaptured, identifier: { ...uncaptured.identifier } }

      yield* standalone

      const identifiers = yield* sqlMapping(
        () =>
          sql<Row>`select ${i.fields("i_")} from ${i.name}
          where ${i.column(mapping.identifier.namespace)} = ${
            i.value(mapping.identifier.namespace, input.identifier.namespace)
          }
            and ${i.column(mapping.identifier.value)} = ${i.value(mapping.identifier.value, input.identifier.value)}`
      ).pipe(Effect.flatten)

      const identifier = identifiers.length === 1
        ? yield* sqlMapping(() => i.decode(identifiers[0]!, "i_"))
        : undefined

      if (
        identifier === undefined ||
        !(yield* sqlMapping(() => mapping.identifier.isCurrent(identifier)))
      ) {
        return Option.none()
      }

      const credential = yield* snapshot(
        identifier[mapping.identifier.subjectId],
        input.moduleId,
        input.identifier
      )

      return credential === undefined ||
          (input.subjectId !== undefined && credential.revision.subjectId !== input.subjectId)
        ? Option.none()
        : Option.some(credential)
    }, failure),
    rehashIfCurrent: Effect.fnUntraced(function*(input) {
      const nextVerifier = Redacted.make(
        yield* Schema.decodeEffect(EncodedPasswordHash)(Redacted.value(input.nextVerifier))
      )

      const credential = yield* snapshotPasswordCredential(input.credential)

      yield* standalone
      const nativeId = yield* mapping.subjectId.toNative(credential.revision.subjectId)
      const version = yield* allocate(mapping.allocateRevision, mapping.allocateRevisionSync)

      if (version === credential.verifierVersion) return yield* unavailable()

      // A custom encoder cannot turn maintenance into a semantic credential change.
      const values = yield* sqlMapping(() => {
        const encoded = mapping.credential.encodeVerifier(nextVerifier, version)

        return {
          [mapping.credential.verifier]: encoded[mapping.credential.verifier],
          [mapping.credential.verifierVersion]: encoded[mapping.credential.verifierVersion]
        }
      })

      if (Object.values(values).some((value) => value === undefined)) {
        return yield* PersistenceMappingError.make({
          operation: "mapping",
          cause: unavailable()
        })
      }

      yield* sqlMapping(() => {
        // Ordinary identity predicates retain index use; the full CAS ignores text collation.
        const exact = sql.and(
          Object.entries({
            [mapping.credential.moduleId]: credential.moduleId,
            [mapping.credential.subjectId]: nativeId,
            [mapping.credential.credentialId]: credential.credentialId,
            [mapping.credential.credentialRevision]: credential.credentialRevision,
            [mapping.credential.verifierVersion]: credential.verifierVersion,
            [mapping.credential.verifier]: Redacted.value(credential.verifier),
            [mapping.credential.normalization]: credential.normalization
          }).map(([key, value]) => {
            const column = c.column(key),
              bound = c.value(key, value)

            if (!Predicate.isString(value)) return sql`${column} = ${bound}`

            return sql.onDialectOrElse({
              mysql: () => sql`binary ${column} = binary ${bound}`,
              pg: () => sql`convert_to(cast(${column} as text), 'UTF8') = convert_to(cast(${bound} as text), 'UTF8')`,
              orElse: () => sql`cast(${column} as blob) = cast(${bound} as blob)`
            })
          })
        )

        return sql`${c.update(values)}
          where ${c.column(mapping.credential.moduleId)} = ${c.value(mapping.credential.moduleId, credential.moduleId)}
            and ${c.column(mapping.credential.subjectId)} = ${c.value(mapping.credential.subjectId, nativeId)}
            and ${c.column(mapping.credential.credentialId)} = ${
          c.value(mapping.credential.credentialId, credential.credentialId)
        }
            and ${exact}`
      }).pipe(Effect.flatten)
    }, failure)
  } satisfies Pick<PasswordPersistence["Service"], "findCredential" | "rehashIfCurrent">
})
