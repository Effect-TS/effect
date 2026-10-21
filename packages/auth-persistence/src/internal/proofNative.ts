import { CurrentCommitJournal, type LifecycleHooks } from "@effect/auth/Hooks"
import * as Proofs from "@effect/auth/Proofs"
import * as Digest from "effect/crypto/Digest"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import type { Fragment } from "effect/sql/Statement"

import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { AnyProofPersistenceMapping } from "./models/proofModel.ts"
import type { NativeSqlTables } from "./nativeSqlTable.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import { cleanupSqlRows } from "./sqlCleanup.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlCommitReceipt,
  registerSqlPostcondition,
  SqlBatchCommit,
  type SqlCommitOwnerError
} from "./sqlCommit.ts"

const bindingJson = Schema.encodeSync(Schema.fromJsonString(Proofs.ProofBinding))
const decodeBinding = Schema.decodeUnknownSync(Schema.fromJsonString(Proofs.ProofBinding))
const unavailable = () => Proofs.ProofUnavailable.make({})

const invalidState = () => PersistenceMappingError.make({ operation: "decode", cause: "Invalid proof state" })

/** Flow/context changes do not allocate new durable series. The hash bounds the
 * indexed key; the complete canonical binding is still checked independently. */
const seriesKey = Effect.fnUntraced(function*(binding: Proofs.ProofBinding) {
  const digest = yield* Digest.Digest

  const tuple = Schema.encodeSync(
    Schema.fromJsonString(Schema.Array(Schema.NullOr(Schema.String)))
  )([
    "effect-auth/proof-series/v1",
    binding.identifier.namespace,
    binding.identifier.value,
    binding._tag === "Identifier" ? null : binding.revision.subjectId
  ])

  return Base64Url.encode(yield* digest.digest(Digest.sha256, new TextEncoder().encode(tuple)))
})

/**
 * Shared native statements. A protected mutation calls redeemLocked only after
 * taking its subject lock; bare redemption calls lockSubject first.
 *
 * @internal
 */
export const makeNativeProofStore = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyProofPersistenceMapping,
  batch = false
) {
  const externalOwner = yield* Effect.serviceOption(CurrentSqlCommit)
  const sql = (yield* SqlClient).withoutTransforms()
  const digest = yield* Digest.Digest
  const p = mapping.proof
  const proof = tables(p.table)
  const subject = tables(mapping.subject.table)
  const mysql = sql.onDialectOrElse({ mysql: () => true, orElse: () => false })
  const locking = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })
  const rowLocks = !batch && sql.onDialectOrElse({ sqlite: () => false, orElse: () => true })
  const now = tables.expression(mapping.clock.engineNowMillis)
  const millis = (key: string) => tables.expression(mapping.clock.toMillis(proof.column(key)))
  const instant = (value: Fragment) => tables.expression(mapping.clock.fromMillis(sql`(${value})`))

  const exact = (key: string, value: unknown) => exactSqlText(sql, proof.column(key), proof.value(key, value))

  const series = Effect.fnUntraced(function*(input: {
    readonly moduleId: string
    readonly purpose: Proofs.ProofPurpose
    readonly binding: Proofs.ProofBinding
  }) {
    const key = yield* seriesKey(input.binding).pipe(Effect.provideService(Digest.Digest, digest))

    return {
      key,
      predicate: sql.and([
        exact(p.moduleId, input.moduleId),
        exact(p.purpose, input.purpose),
        exact(p.seriesKey, key)
      ])
    }
  })

  const decode = (row: Readonly<Record<string, unknown>>) => {
    const value = proof.decode(row, "proof_")

    return Schema.decodeUnknownSync(Proofs.ProofRecord)({
      moduleId: value[p.moduleId],
      purpose: value[p.purpose],
      proofId: value[p.proofId],
      binding: decodeBinding(value[p.binding]),
      verifier: { keyId: value[p.verifierKeyId], digest: value[p.verifierDigest] },
      issuedAtMillis: mapping.clock.decodeInstant(value[p.issuedAt]),
      expiresAtMillis: mapping.clock.decodeInstant(value[p.expiresAt])
    })
  }

  const clock = Effect.gen(function*() {
    const rows = yield* sql`select ${now} as engine_now`

    return yield* Schema.decodeEffect(Proofs.ProofInstant)(Number(rows[0]?.engine_now))
  })

  const lockSubject = Effect.fnUntraced(function*(binding: Proofs.ProofBinding) {
    if (binding._tag === "Identifier") return true
    const nativeId = yield* mapping.subjectId.toNative(binding.revision.subjectId)
    const condition = sql`${subject.column(mapping.subject.id)} = ${subject.value(mapping.subject.id, nativeId)}`

    const rows = yield* sql`select ${subject.fields("proof_subject_")} from ${subject.name} where ${condition} ${
      batch ? sql`` : locking
    }`

    if (rows.length === 0) return false
    if (!(rows.length === 1)) return yield* invalidState()
    const value = subject.decode(rows[0]!, "proof_subject_")
    const decoded = yield* mapping.subjectId.toSubject(value[mapping.subject.id])

    if (!(decoded === binding.revision.subjectId)) return yield* invalidState()
    if (batch) {
      yield* appendSqlBatchStatement(
        sqlBatchAssertion(sql, sql`exists(select 1 from ${subject.name} where ${condition})`)
      )
    }

    return true
  })

  const issue = Effect.fnUntraced(function*(
    input: Parameters<Proofs.ProofPersistence["Service"]["issue"]>[0]
  ): Effect.fn.Return<
    Proofs.ProofIssueDecision,
    | SqlError
    | Schema.SchemaError
    | PersistenceMappingError
    | SqlCommitOwnerError,
    CurrentSqlCommit
  > {
    if (!input.eligible) return { _tag: "Suppressed" }
    const record = yield* Schema.decodeEffect(Proofs.ProofIssueRecord)(input.record)

    if (
      !(
        Number.isSafeInteger(input.lifetimeMillis) &&
        input.lifetimeMillis > 0 &&
        Number.isSafeInteger(input.resendCooldownMillis) &&
        input.resendCooldownMillis >= 0
      )
    ) {
      return yield* invalidState()
    }
    const key = yield* series(record)
    const binding = bindingJson(record.binding)
    // PostgreSQL's clock_timestamp is volatile. One materialized sample owns
    // both timestamps and this upsert's cooldown/expiry decision.
    const decisionNow = batch || mysql ? now : sql`(select instant from effect_auth_proof_clock)`

    const allowed = sql.and([
      sql`${millis(p.issuedAt)} + ${input.resendCooldownMillis} <= ${decisionNow}`,
      sql`(${millis(p.expiresAt)} <= ${decisionNow} or ${exact(p.binding, binding)})`
    ])

    let sampled: number | undefined

    if (batch || mysql) {
      const rows = yield* sql`select ${proof.fields("proof_")} from ${proof.name} where ${key.predicate} ${
        mysql ? locking : sql``
      }`

      sampled = yield* clock
      if (!(rows.length <= 1)) return yield* invalidState()
      if (rows[0] !== undefined) {
        const old = decode(rows[0])

        if (
          old.issuedAtMillis + input.resendCooldownMillis > sampled ||
          (old.expiresAtMillis > sampled && bindingJson(old.binding) !== binding)
        ) {
          return { _tag: "Suppressed" }
        }
      }
    }

    const issuedAt = sampled === undefined ? instant(decisionNow) : mapping.clock.encodeInstant(sampled)

    const expiresAt = sampled === undefined
      ? instant(sql`${decisionNow} + ${input.lifetimeMillis}`)
      : mapping.clock.encodeInstant(sampled + input.lifetimeMillis)

    const values = {
      ...p.encodeInsert({ record, seriesKey: key.key }),
      [p.moduleId]: record.moduleId,
      [p.purpose]: record.purpose,
      [p.seriesKey]: key.key,
      [p.proofId]: record.proofId,
      [p.binding]: binding,
      [p.verifierKeyId]: record.verifier.keyId,
      [p.verifierDigest]: record.verifier.digest,
      [p.issuedAt]: issuedAt,
      [p.expiresAt]: expiresAt,
      [p.failedAttempts]: 0
    }

    if (mysql) {
      const changed = yield* executeSqlChange(
        sql,
        sql`${proof.update(values)} where ${key.predicate} and ${allowed}`
      )

      if (changed === 0) yield* sql`${proof.insert(values)}`
      if (!(sampled !== undefined)) return yield* invalidState()

      return {
        _tag: "Issued",
        record: yield* Schema.decodeEffect(Proofs.ProofRecord)({
          ...record,
          issuedAtMillis: sampled,
          expiresAtMillis: sampled! + input.lifetimeMillis
        })
      }
    }

    const replaced = [
      p.proofId,
      p.binding,
      p.verifierKeyId,
      p.verifierDigest,
      p.issuedAt,
      p.expiresAt,
      p.failedAttempts
    ]

    const excluded = proof.as("excluded")
    const upsert = sql`${proof.insert(values)} on conflict (${
      sql.join(", ", false)([p.moduleId, p.purpose, p.seriesKey].map(proof.columnName))
    }) do update set ${
      sql.join(", ", false)(replaced.map((key) => sql`${proof.columnName(key)} = ${excluded.column(key)}`))
    } where ${allowed}`

    if (batch) {
      if (!(sampled !== undefined)) return yield* invalidState()
      yield* appendSqlBatchStatement(
        sqlBatchAssertion(
          sql,
          sql`${now} >= ${sampled} and ${now} < ${sampled! + input.lifetimeMillis}`
        )
      )
      yield* appendSqlBatchStatement(upsert)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))

      return {
        _tag: "Issued",
        record: yield* Schema.decodeEffect(Proofs.ProofRecord)({
          ...record,
          issuedAtMillis: sampled,
          expiresAtMillis: sampled! + input.lifetimeMillis
        })
      }
    }

    const rows =
      yield* sql`with effect_auth_proof_clock as materialized (select ${now} as instant) ${upsert} returning ${
        proof.fields("proof_")
      }`

    if (!(rows.length <= 1)) return yield* invalidState()

    return rows[0] === undefined
      ? { _tag: "Suppressed" }
      : { _tag: "Issued", record: decode(rows[0]) }
  })

  const redeemLocked = Effect.fnUntraced(function*(original: Proofs.ProofRedemptionInput) {
    const input = yield* Schema.decodeEffect(Proofs.ProofRedemptionInput)(original)
    const key = yield* series(input)

    const current = sql.and([
      key.predicate,
      exact(p.proofId, input.proofId),
      exact(p.binding, bindingJson(input.binding)),
      sql`${millis(p.issuedAt)} <= ${now}`,
      sql`${millis(p.expiresAt)} > ${now}`,
      sql`${proof.column(p.failedAttempts)} >= 0`,
      sql`${proof.column(p.failedAttempts)} < ${input.maximumFailedAttempts}`
    ])

    const valid = sql.and([
      current,
      input.candidate === undefined
        ? sql`1 = 0`
        : sql.and([
          exact(p.verifierKeyId, input.candidate.keyId),
          exact(p.verifierDigest, input.candidate.digest)
        ])
    ])

    // No subject lock serializes an identifier-bound proof. Lock its row first so
    // concurrent wrong guesses cannot all compare before any of them is charged.
    if (input.binding._tag === "Identifier" && rowLocks) {
      yield* sql`select 1 from ${proof.name} where ${current} ${locking}`
    }

    const deletion = sql`delete from ${proof.name} where ${valid}`

    const rows = batch || mysql
      ? yield* sql`select ${proof.fields("proof_")} from ${proof.name} where ${valid} ${mysql ? locking : sql``}`
      : yield* sql`${deletion} returning ${proof.fields("proof_")}`

    if (!(rows.length <= 1)) return yield* invalidState()
    if (rows[0] === undefined) {
      const failure = sql`${
        proof.update({ [p.failedAttempts]: sql`${proof.column(p.failedAttempts)} + 1` })
      } where ${current}`

      if (batch) {
        // The planning miss never authorizes charging or accepting a replacement.
        yield* appendSqlBatchStatement(
          sqlBatchAssertion(sql, sql`not exists(select 1 from ${proof.name} where ${valid})`)
        )
        yield* appendSqlBatchStatement(failure)
      } else yield* sql`${failure}`

      return { decision: "rejected" as const }
    }
    const consumed = decode(rows[0])

    if (mysql) {
      if (!((yield* executeSqlChange(sql, deletion)) === 1)) return yield* invalidState()
    }
    if (batch) {
      yield* appendSqlBatchStatement(deletion)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = 1`))
    }
    const validUntil = sql`${now} >= ${consumed.issuedAtMillis} and ${now} < ${consumed.expiresAtMillis}`

    if (Option.isSome(externalOwner) && externalOwner.value.origin === "application") {
      const absent = sql`not exists(select 1 from ${proof.name} where ${exact(p.moduleId, input.moduleId)} and ${
        exact(p.proofId, input.proofId)
      })`
      const condition = sql`${absent} and ${validUntil}`

      if (batch) {
        yield* registerSqlBatchPostcondition({
          name: "proof-redemption",
          statement: sqlBatchAssertion(sql, condition)
        })
      } else {
        yield* registerSqlPostcondition({
          name: "proof-redemption",
          check: Effect.gen(function*() {
            const rows = yield* sql`select 1 as valid where ${condition}`

            if (!(rows.length === 1)) return yield* invalidState()
          })
        })
      }
    }

    return { decision: "redeemed" as const, validUntil }
  })

  const cancel = Effect.fnUntraced(function*(
    input: Parameters<Proofs.ProofPersistence["Service"]["cancel"]>[0]
  ) {
    const key = yield* series(input)
    const deletion = sql`delete from ${proof.name} where ${key.predicate} and ${
      exact(p.binding, bindingJson(input.binding))
    }`

    if (batch) yield* appendSqlBatchStatement(deletion)
    else yield* sql`${deletion}`
  })

  const cleanup = (input: Parameters<Proofs.ProofPersistence["Service"]["cleanup"]>[0]) =>
    cleanupSqlRows(
      [
        {
          table: proof,
          keys: [p.moduleId, p.proofId],
          due: sql`${exact(p.moduleId, input.moduleId)} and ${millis(p.expiresAt)} <= ${now}`,
          order: [proof.column(p.expiresAt), proof.column(p.proofId)]
        }
      ],
      input.limit,
      batch
    )

  return { issue, lockSubject, redeemLocked, cancel, cleanup, mysql }
})

export const makeNativeProofServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: AnyProofPersistenceMapping
): Effect.fn.Return<
  { readonly proofPersistence: Proofs.ProofPersistence["Service"] },
  Proofs.ProofUnavailable,
  SqlClient | LifecycleHooks | Digest.Digest | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const store = yield* makeNativeProofStore(tables, mapping, batch !== undefined)

  const run = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: "transaction" | "statement" = "transaction"
  ) =>
    batch === undefined
      ? executor.run(effect, mode)
      : executor.batch(effect).pipe(Effect.provideService(SqlBatchCommit, batch))

  const prepare = Effect.fnUntraced(function*<Value, A>(value: Value, project: Proofs.PrepareProofCommit<Value, A>) {
    const journal = yield* CurrentCommitJournal

    const receipt = project(value, journal)

    if (!(receipt?._tag === "PreparedCommit" && Effect.isEffect(receipt.read))) {
      return yield* invalidState()
    }
    yield* registerSqlCommitReceipt(receipt)

    return receipt
  })

  const proofPersistence: Proofs.ProofPersistence["Service"] = {
    issue: (input, project) =>
      run(
        Effect.gen(function*() {
          return yield* prepare(yield* store.issue(input), project)
        }),
        store.mysql ? "transaction" : "statement"
      ),
    redeem: (input, project) =>
      run(
        Effect.gen(function*() {
          const locked = yield* store.lockSubject(input.binding)

          return yield* prepare(
            locked ? (yield* store.redeemLocked(input)).decision : "rejected",
            project
          )
        })
      ),
    cancel: (input, project) =>
      run(
        Effect.gen(function*() {
          yield* store.cancel(input)

          return yield* prepare(undefined, project)
        }),
        "statement"
      ),
    cleanup: (input, project) =>
      run(
        Effect.gen(function*() {
          return yield* prepare(yield* store.cleanup(input), project)
        }),
        "statement"
      )
  }

  return { proofPersistence }
})
