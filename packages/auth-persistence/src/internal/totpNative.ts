import type { LifecycleHooks } from "@effect/auth/Hooks"
import { AuthenticationRequirement, SecurityRevision } from "@effect/auth/Sessions"
import {
  type TotpDecision,
  TotpMutation,
  type TotpPersistence,
  TotpPolicy,
  TotpRecord,
  TotpSnapshot,
  TotpUnavailable
} from "@effect/auth/Totp"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql/SqlClient"
import type { Fragment } from "effect/sql/Statement"

import { digest, randomId } from "./crypto.ts"
import { sqlBatchAssertion } from "./d1Planning.ts"
import { PersistenceMappingError } from "./mappingError.ts"
import type { TotpMapping } from "./models/totpModel.ts"
import type { NativeSqlTables, SqlTable } from "./nativeSqlTable.ts"
import { makeNativeSessionPending, prepareNativeSession } from "./sessionNativePending.ts"
import { makeConditionalSqlInsert } from "./sessionNativeRecord.ts"
import { assessSessionAt, sameSessionRevision } from "./sessionNativeState.ts"
import { exactSqlText, executeSqlChange } from "./sqlChange.ts"
import {
  appendSqlBatchStatement,
  CurrentSqlCommit,
  makeSqlCommitExecutor,
  registerSqlBatchPostcondition,
  registerSqlPostcondition,
  SqlBatchCommit
} from "./sqlCommit.ts"
import type { AnyTableModel } from "./tableModel.ts"

export type NativeTotpMapping = TotpMapping<
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  AnyTableModel
>

const unavailable = () => TotpUnavailable.make({})

const invalidState = () => PersistenceMappingError.make({ operation: "decode", cause: "Invalid TOTP authority" })

const codec = Schema.fromJsonString(TotpRecord)
const encodeTotpRecord = Schema.encodeSync(codec)
const reject: TotpDecision = { _tag: "Rejected" }

export const makeNativeTotpServices = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: NativeTotpMapping
): Effect.fn.Return<
  { readonly totpPersistence: TotpPersistence["Service"] },
  never,
  SqlClient | LifecycleHooks | Digest.Digest | SecureRandom.SecureRandom | SqlBatchCommit
> {
  const batch = yield* SqlBatchCommit
  const conditionalInsert = yield* makeConditionalSqlInsert()

  const sql = (yield* SqlClient).withoutTransforms(),
    cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
      Context.add(Digest.Digest, yield* Digest.Digest)
    ),
    executor = yield* makeSqlCommitExecutor(unavailable),
    external = yield* Effect.serviceOption(CurrentSqlCommit)

  const s = mapping.subject,
    f = mapping.factor,
    c = mapping.credential,
    subject = tables(s.table),
    factor = tables(f.table),
    credential = tables(c.table),
    engineNow = tables.expression(mapping.engineNowMillis)

  const active = tables.expression(s.activeCondition),
    activeCredential = tables.expression(c.activeCondition)

  const lock = sql.onDialectOrElse({ sqlite: () => sql``, orElse: () => sql`for update` })

  const nativeLocks = batch === undefined && sql.onDialectOrElse({ sqlite: () => false, orElse: () => true })

  const exact = (table: SqlTable, key: string, value: unknown) =>
    exactSqlText(sql, table.column(key), table.value(key, value))

  const id = (table: SqlTable, key: string, value: unknown) => sql`${table.column(key)} = ${table.value(key, value)}`

  const pending = mapping.pending === undefined
    ? undefined
    : yield* makeNativeSessionPending(
      tables,
      {
        ...mapping.pending,
        subjectId: {
          toNative: (id) => Effect.sync(() => mapping.subjectIds.toNative(id)),
          toSubject: (id) => Effect.sync(() => mapping.subjectIds.toSubject(id)),
          equals: Object.is
        }
      },
      batch !== undefined
    )

  const provide = <A, E, R>(work: Effect.Effect<A, E, R>) => work.pipe(Effect.provideContext(cryptoServices))

  const run = <A, E, R>(work: Effect.Effect<A, E, R>) =>
    batch === undefined
      ? executor.run(provide(work))
      : executor.batch(provide(work)).pipe(Effect.provideService(SqlBatchCommit, batch))

  const stage = Effect.fnUntraced(function*(statement: Fragment, expected = 1) {
    if (batch !== undefined) {
      yield* appendSqlBatchStatement(sql`${statement}`)
      yield* appendSqlBatchStatement(sqlBatchAssertion(sql, sql`changes() = ${expected}`))
    } else {
      if (!((yield* executeSqlChange(sql, statement)) === expected)) return yield* invalidState()
    }
  })

  const capture = Effect.fnUntraced(function*(
    subjectId: TotpRecord["subjectId"],
    locking = false
  ) {
    const nativeId = mapping.subjectIds.toNative(subjectId)

    if (!(mapping.subjectIds.toSubject(nativeId) === subjectId)) return yield* invalidState()

    const scope = yield* digest(
      `effect-auth/totp/scope/v1/${mapping.moduleId.length}:${mapping.moduleId}/${subjectId}`
    )

    if (locking && nativeLocks) {
      const owners = yield* sql`select ${subject.column(s.id)} from ${subject.name} where ${
        id(subject, s.id, nativeId)
      } and ${active} limit 2 ${lock}`

      if (!(owners.length <= 1)) return yield* invalidState()
      if (owners[0] === undefined) return undefined
    }
    // The distinct subject lock always precedes the ordered authority locks.
    // Advisory snapshots use this same bounded join without transaction control.
    const currentCredentials = sql`select ${credential.fields("c_")} from ${credential.name} where ${
      id(credential, c.subjectId, nativeId)
    } and ${activeCredential} order by ${credential.column(c.id)} limit 65 ${locking && nativeLocks ? lock : sql``}`

    const rows = yield* sql`with current_credentials as ${
      sql.onDialectOrElse({ pg: () => sql`materialized`, orElse: () => sql`` })
    } (${currentCredentials})
      select ${subject.fields("s_")}, ${factor.fields("f_")}, current_credentials.*, ${engineNow} as engine_now
      from ${subject.name} left join ${factor.name} on ${
      exact(factor, f.scope, scope)
    } left join current_credentials on 1 = 1
      where ${id(subject, s.id, nativeId)} and ${active} limit 65`

    if (!(rows.length <= 64)) return yield* invalidState()
    if (rows[0] === undefined) return undefined

    const subjectRow = subject.decode(rows[0], "s_"),
      decoded = factor.decode(rows[0], "f_")

    const factorRow = decoded[f.scope] === null || decoded[f.scope] === undefined ? undefined : decoded

    const now = Number(rows[0].engine_now)
    const credentials: Array<{ credentialId: unknown; revision: unknown }> = []

    for (const row of rows) {
      const value = credential.decode(row, "c_")

      if (value[c.id] === null || value[c.id] === undefined) continue
      if (!(mapping.subjectIds.toSubject(value[c.subjectId]) === subjectId)) {
        return yield* invalidState()
      }
      if (credentials.some((entry) => entry.credentialId === value[c.id])) {
        return yield* invalidState()
      }
      credentials.push({ credentialId: value[c.id], revision: value[c.revision] })
    }

    const revision = yield* Schema.decodeUnknownEffect(TotpSnapshot.fields.revision)({
      subjectId,
      securityRevision: subjectRow[s.securityRevision],
      credentials
    })

    const ordered = {
      ...revision,
      credentials: [...revision.credentials].sort((left, right) => left.credentialId.localeCompare(right.credentialId))
    }

    if (
      !(mapping.subjectIds.toSubject(subjectRow[s.id]) === subjectId && Number.isSafeInteger(now))
    ) {
      return yield* invalidState()
    }

    const record = factorRow === undefined ? null : yield* Schema.decodeUnknownEffect(codec)(factorRow[f.state])

    if (
      !(
        record === null ||
        (record.moduleId === mapping.moduleId &&
          record.subjectId === subjectId &&
          record.version === factorRow?.[f.version] &&
          (record.secret === null || record.secret.revision === record.revision) &&
          (record.pending === null || record.pending.secret.revision === record.pending.revision))
      )
    ) {
      return yield* invalidState()
    }

    if (
      !(
        record === null ||
        record.secret === null ||
        ordered.credentials.some(
          (entry) => entry.credentialId === record.credentialId && entry.revision === record.revision
        )
      )
    ) {
      return yield* invalidState()
    }

    const snapshot = yield* Schema.decodeEffect(Schema.toType(TotpSnapshot))({
      revision: ordered,
      requirement: mapping.subject.decodeRequirement(subjectRow),
      record
    })

    return { nativeId, subjectRow, factorRow, scope, snapshot, now }
  })

  const mutate = Effect.fnUntraced(function*(input: TotpMutation) {
    if (
      !(
        input.moduleId === mapping.moduleId &&
        Schema.encodeSync(Schema.fromJsonString(TotpPolicy))(input.policy) ===
          Schema.encodeSync(Schema.fromJsonString(TotpPolicy))(mapping.policy)
      )
    ) {
      return yield* invalidState()
    }
    const captured = yield* capture(input.subjectId, true)

    if (captured === undefined) return reject

    const { snapshot, subjectRow, factorRow, scope, nativeId, now } = captured,
      current = snapshot.record,
      policy = input.policy,
      action = input.action

    if (
      snapshot.revision.securityRevision !== input.snapshot.revision.securityRevision ||
      (current?.version ?? null) !== (input.snapshot.record?.version ?? null) ||
      (current === null) !== (input.snapshot.record === null) ||
      (current !== null && encodeTotpRecord(current) !== encodeTotpRecord(input.snapshot.record!))
    ) {
      return reject
    }

    let expectedCount: number | undefined,
      countGuardIndex = -1

    const guards: Array<Fragment> = [],
      timeGuards: Array<Fragment> = [],
      credentialGuards: Array<{ credentialId: string; condition: Fragment }> = []

    const timeBound = (start: number, end: number) => {
      timeGuards.push(sql`${engineNow} >= ${start} and ${engineNow} < ${end}`)
    }

    if (
      action._tag === "Enroll" ||
      action._tag === "Confirm" ||
      action._tag === "Disable" ||
      action._tag === "Regenerate"
    ) {
      const authorization = input.authorization

      if (authorization === undefined) return reject
      const { challenge, evidence } = authorization

      const expectedAction = {
        Enroll: "enroll",
        Confirm: "confirm",
        Disable: "disable",
        Regenerate: "regenerate"
      }[action._tag]

      if (
        challenge.action !== expectedAction ||
        challenge.moduleId !== mapping.moduleId ||
        challenge.revision.subjectId !== input.subjectId ||
        challenge.revision.securityRevision !== snapshot.revision.securityRevision ||
        evidence.flowId !== challenge.flowId ||
        evidence.bindingDigest !== challenge.bindingDigest ||
        evidence.revision.subjectId !== input.subjectId ||
        evidence.revision.securityRevision !== snapshot.revision.securityRevision
      ) {
        return reject
      }
      for (const revision of evidence.revision.credentials) {
        credentialGuards.push({
          credentialId: revision.credentialId,
          condition: sql`exists(select 1 from ${credential.name} where ${id(credential, c.subjectId, nativeId)} and ${
            exact(credential, c.id, revision.credentialId)
          } and ${exact(credential, c.revision, revision.revision)} and ${activeCredential})`
        })
      }
      expectedCount = evidence.revision.credentials.length
      countGuardIndex = guards.length
      guards.push(
        sql`(select count(*) from ${credential.name} where ${
          id(credential, c.subjectId, nativeId)
        } and ${activeCredential}) = ${evidence.revision.credentials.length}`
      )

      const requirements = [authorization.requirement, snapshot.requirement],
        maximumAge = Math.min(
          policy.maximumEvidenceAgeMillis,
          ...requirements.map((r) => r.maximumAgeMillis)
        )

      for (const requirement of requirements) {
        const assessed = yield* assessSessionAt(
          evidence,
          { ...requirement, maximumAgeMillis: maximumAge },
          now
        ).pipe(Effect.result)

        if (assessed._tag === "Failure" || !assessed.success.satisfied) return reject
      }
      for (const proof of evidence.proofs) {
        const verified = DateTime.toEpochMillis(proof.verifiedAt)

        if (verified > now || now - verified >= maximumAge) return reject
        timeBound(verified, verified + maximumAge)
      }
      if (
        (current !== null && current.secret !== null) ||
        action._tag === "Disable" ||
        action._tag === "Regenerate"
      ) {
        const factors = new Set(evidence.proofs.flatMap((p) => p.factors))

        if (
          !(
            evidence.proofs.some(
              (p) => p.userVerified && p.phishingResistant && p.factors.includes("possession")
            ) ||
            (factors.has("knowledge") &&
              factors.has("possession") &&
              new Set(evidence.proofs.map((p) => p.credentialId)).size >= 2)
          )
        ) {
          return reject
        }
      }
    }
    if (action._tag === "Recovery" && action.reset) {
      const target = action.pending

      if (
        target === undefined ||
        pending === undefined ||
        mapping.pending === undefined ||
        target.revision.subjectId !== input.subjectId ||
        target.revision.securityRevision !== snapshot.revision.securityRevision ||
        target.expiresAtMillis <= now
      ) {
        return reject
      }
      const selected = yield* pending.read("Login", target.digest)

      if (selected === undefined) return reject
      const original = yield* mapping.pending.login.decode(selected.record.snapshot)

      if (
        selected.record.flowId !== target.flowId ||
        selected.record.bindingDigest !== target.bindingDigest ||
        selected.record.subjectId !== input.subjectId ||
        selected.record.expiresAtMillis !== target.expiresAtMillis ||
        original.digest !== target.digest ||
        !sameSessionRevision(original.evidence.revision, target.revision)
      ) {
        return reject
      }
      guards.push(
        sql`exists(select 1 from ${pending.table.name} where ${
          pending.predicate(pending.table, "Login", target.digest)
        } and ${exact(pending.table, pending.p.snapshot, selected.record.snapshot)} and ${
          exact(pending.table, pending.p.version, original.version)
        })`
      )
      for (const revision of target.revision.credentials) {
        credentialGuards.push({
          credentialId: revision.credentialId,
          condition: sql`exists(select 1 from ${credential.name} where ${id(credential, c.subjectId, nativeId)} and ${
            exact(credential, c.id, revision.credentialId)
          } and ${exact(credential, c.revision, revision.revision)} and ${activeCredential})`
        })
      }
      timeBound(0, target.expiresAtMillis)
    }

    let next: TotpRecord,
      semantic = false,
      accepted = true

    if (action._tag === "Enroll") {
      const candidate = action.record

      if (
        candidate.subjectId !== input.subjectId ||
        candidate.moduleId !== input.moduleId ||
        candidate.pending === null ||
        candidate.pending.expiresAtMillis <= now ||
        candidate.pending.expiresAtMillis > now + policy.enrollmentLifetimeMillis ||
        candidate.pending.failedAttempts !== 0 ||
        candidate.pending.secret.revision !== candidate.pending.revision
      ) {
        return reject
      }
      // Reissuing cannot erase the confirmation budget during its current enrollment lifetime.
      if (current !== null && current.pending !== null && current.pending.expiresAtMillis > now) {
        return reject
      }
      if (
        current !== null &&
        (candidate.credentialId !== current.credentialId ||
          encodeTotpRecord({ ...candidate, pending: current.pending }) !==
            encodeTotpRecord(current))
      ) {
        return reject
      }
      if (
        current === null &&
        (candidate.secret !== null ||
          candidate.recoveryDigests.length !== 0 ||
          candidate.acceptedStep !== -1 ||
          candidate.failedAttempts !== 0)
      ) {
        return reject
      }
      next = candidate
      timeBound(0, candidate.pending.expiresAtMillis)
    } else {
      if (current === null) return reject
      next = { ...current }
      if (action._tag === "Confirm") {
        const pending = current.pending

        if (
          pending === null ||
          pending.enrollmentId !== action.enrollmentId ||
          pending.expiresAtMillis <= now ||
          pending.failedAttempts >= policy.attemptLimit
        ) {
          return reject
        }
        timeBound(0, pending.expiresAtMillis)
        if (
          action.matchedStep === null ||
          Math.abs(Math.floor(now / 30000) - action.matchedStep) > policy.clockSkewSteps
        ) {
          next = {
            ...current,
            pending: { ...pending, failedAttempts: pending.failedAttempts + 1 }
          }
          accepted = false
        } else {
          if (new Set(action.recoveryDigests).size !== 10) return reject
          next = {
            ...current,
            secret: pending.secret,
            revision: pending.secret.revision,
            pending: null,
            recoveryDigests: action.recoveryDigests,
            acceptedStep: action.matchedStep,
            attemptWindow: now,
            failedAttempts: 0
          }
          semantic = true
          timeBound(
            Math.max(0, (action.matchedStep - policy.clockSkewSteps) * 30000),
            (action.matchedStep + policy.clockSkewSteps + 1) * 30000
          )
        }
      } else if (action._tag === "Verify" || action._tag === "Recovery") {
        if (current.secret === null) return reject

        const expired = now >= current.attemptWindow + policy.attemptWindowMillis,
          attempts = expired ? 0 : current.failedAttempts,
          start = expired ? now : current.attemptWindow

        if (attempts >= policy.attemptLimit) return reject
        next = { ...current, attemptWindow: start, failedAttempts: attempts + 1 }
        if (action._tag === "Verify") {
          if (
            action.matchedStep === null ||
            action.matchedStep <= current.acceptedStep ||
            Math.abs(Math.floor(now / 30000) - action.matchedStep) > policy.clockSkewSteps
          ) {
            accepted = false
          } else {
            next = { ...next, acceptedStep: action.matchedStep, failedAttempts: 0 }
            timeBound(
              Math.max(0, (action.matchedStep - policy.clockSkewSteps) * 30000),
              (action.matchedStep + policy.clockSkewSteps + 1) * 30000
            )
          }
        } else {
          if (
            (action.reset
              ? policy.lostFactorRecovery !== "reset-with-recovery-code"
              : !policy.allowRecoveryCodeForPending) ||
            !current.recoveryDigests.includes(action.digest)
          ) {
            accepted = false
          } else {
            next = {
              ...next,
              recoveryDigests: current.recoveryDigests.filter((value) => value !== action.digest),
              failedAttempts: 0
            }
            if (action.reset) {
              next = {
                ...next,
                secret: null,
                pending: null,
                recoveryDigests: [],
                revision: yield* randomId
              }
              semantic = true
            }
          }
        }
      } else {
        if (current.secret === null) return reject
        semantic = action._tag === "Disable"
        if (action._tag === "Disable") {
          next = {
            ...current,
            secret: null,
            pending: null,
            recoveryDigests: [],
            revision: yield* randomId
          }
        } else {
          if (new Set(action.recoveryDigests).size !== 10) return reject
          next = { ...current, recoveryDigests: action.recoveryDigests }
        }
      }
    }
    next = { ...next, version: yield* randomId }

    const ownerKey = id(subject, s.id, nativeId)
    const initialAuthority = sql`exists(select 1 from ${subject.name} where ${ownerKey} and ${
      exact(subject, s.securityRevision, snapshot.revision.securityRevision)
    } and ${active})`

    const initialFactor = factorRow === undefined
      ? sql`not exists(select 1 from ${factor.name} where ${exact(factor, f.scope, scope)})`
      : sql`exists(select 1 from ${factor.name} where ${exact(factor, f.scope, scope)} and ${
        exact(factor, f.version, current!.version)
      })`

    const policyGuard = sql.and(
      (s.requirementColumns ?? []).map((key) =>
        subjectRow[key] === null
          ? sql`${subject.column(key)} is null`
          : sql`${subject.column(key)} = ${subject.value(key, subjectRow[key])}`
      )
    )

    const policyCondition = sql`exists(select 1 from ${subject.name} where ${ownerKey} and ${policyGuard})`
    const fresh = sql.and([...timeGuards, sql`${engineNow} >= ${now}`])

    // A factor UPDATE pins scope and version itself, and MySQL rejects a subquery
    // on the table being updated (error 1093), so only inserts add initialFactor.
    const unchangedFactor = sql.and([
      initialAuthority,
      policyCondition,
      fresh,
      ...guards,
      ...credentialGuards.map((g) => g.condition)
    ])

    let nextRevision = snapshot.revision.securityRevision

    if (semantic) {
      nextRevision = SecurityRevision.make(yield* randomId)
      // Subject is the first lock and first graph mutation. The conditional write
      // validates original evidence before changing the TOTP authority vector.
      yield* stage(
        sql`${
          subject.update({
            [s.securityRevision]: nextRevision,
            [s.factorEnabled]: s.encodeEnabled(next.secret !== null)
          })
        } where ${ownerKey} and ${
          exact(subject, s.securityRevision, snapshot.revision.securityRevision)
        } and ${active} and ${fresh} and ${initialFactor} and ${policyGuard} and ${
          sql.and([...guards, ...credentialGuards.map((g) => g.condition)])
        }`
      )

      const values = {
        ...c.encodeInsert({
          credentialId: next.credentialId,
          subjectId: nativeId,
          revision: next.revision,
          active: next.secret !== null
        }),
        [c.id]: next.credentialId,
        [c.subjectId]: nativeId,
        [c.revision]: next.revision,
        [c.status]: c.encodeStatus(next.secret !== null)
      }

      const insert = credential.insert(values)

      const changes = {
        [c.revision]: next.revision,
        [c.status]: c.encodeStatus(next.secret !== null)
      }

      const upsert = sql.onDialectOrElse({
        mysql: () =>
          sql`${insert} on duplicate key update ${credential.columnName(c.revision)} = case when ${
            id(credential, c.subjectId, nativeId)
          } then ${credential.value(c.revision, next.revision)} else ${credential.column(c.revision)} end, ${
            credential.columnName(c.status)
          } = case when ${id(credential, c.subjectId, nativeId)} then ${
            credential.value(c.status, c.encodeStatus(next.secret !== null))
          } else ${credential.column(c.status)} end`,
        orElse: () =>
          sql`${insert} on conflict (${credential.columnName(c.id)}) do update set ${
            sql.join(", ", false)(
              Object.entries(changes).map(([key, value]) =>
                sql`${credential.columnName(key)} = ${credential.value(key, value)}`
              )
            )
          } where ${id(credential, c.subjectId, nativeId)}`
      })

      if (sql.onDialectOrElse({ mysql: () => true, orElse: () => false }) && batch === undefined) {
        yield* sql`${upsert}`
        if (
          !(
            (yield* sql`select 1 from ${credential.name} where ${id(credential, c.subjectId, nativeId)} and ${
              exact(credential, c.id, next.credentialId)
            } and ${exact(credential, c.revision, next.revision)} and ${
              id(credential, c.status, c.encodeStatus(next.secret !== null))
            }`)
              .length === 1
          )
        ) {
          return yield* invalidState()
        }
      } else yield* stage(upsert)
    }

    const encoded = encodeTotpRecord(next),
      values = { [f.state]: encoded, [f.version]: next.version }

    const afterAuthority = sql`exists(select 1 from ${subject.name} where ${ownerKey} and ${
      exact(subject, s.securityRevision, nextRevision)
    } and ${active})`
    const writeGuard = semantic ? sql`${afterAuthority} and ${fresh}` : unchangedFactor

    if (factorRow === undefined) {
      const insert = {
        ...f.encodeInsert({ scope, state: encoded, version: next.version }),
        [f.scope]: scope,
        ...values
      }

      yield* stage(
        yield* conditionalInsert(
          factor,
          insert,
          semantic ? writeGuard : sql.and([writeGuard, initialFactor])
        )
      )
    } else {
      yield* stage(
        sql`${factor.update(values)} where ${exact(factor, f.scope, scope)} and ${
          exact(factor, f.version, current!.version)
        } and ${writeGuard}`
      )
    }

    const expectedPolicy = semantic
      ? { ...subjectRow, [s.factorEnabled]: s.encodeEnabled(next.secret !== null) }
      : subjectRow

    const finalPolicy = sql`exists(select 1 from ${subject.name} where ${ownerKey} and ${
      sql.and((s.requirementColumns ?? []).map((key) => (expectedPolicy[key] === null
        ? sql`${subject.column(key)} is null`
        : sql`${subject.column(key)} = ${subject.value(key, expectedPolicy[key])}`)
      ))
    })`

    const finalCondition = sql.and([
      afterAuthority,
      finalPolicy,
      fresh,
      sql`exists(select 1 from ${factor.name} where ${exact(factor, f.scope, scope)} and ${
        exact(factor, f.version, next.version)
      } and ${exact(factor, f.state, encoded)})`,
      ...guards.filter((_, index) => expectedCount === undefined || index !== countGuardIndex),
      ...credentialGuards
        .filter((g) => !semantic || g.credentialId !== next.credentialId)
        .map((g) => g.condition),
      ...(semantic
        ? [
          sql`exists(select 1 from ${credential.name} where ${id(credential, c.subjectId, nativeId)} and ${
            exact(credential, c.id, next.credentialId)
          } and ${exact(credential, c.revision, next.revision)} and ${
            id(credential, c.status, c.encodeStatus(next.secret !== null))
          })`
        ]
        : []),
      ...(expectedCount === undefined
        ? []
        : [
          sql`(select count(*) from ${credential.name} where ${
            id(credential, c.subjectId, nativeId)
          } and ${activeCredential}) = ${
            expectedCount +
            (semantic ? (next.secret === null ? 0 : 1) - (current?.secret === null || current === null ? 0 : 1) : 0)
          }`
        ])
    ])

    if (batch !== undefined) {
      yield* registerSqlBatchPostcondition({
        name: "totp-factor-and-authority",
        statement: sqlBatchAssertion(sql, finalCondition)
      })
    } else if (Option.isSome(external)) {
      yield* registerSqlPostcondition({
        name: "totp-factor-and-authority",
        check: Effect.gen(function*() {
          if (!((yield* sql`select 1 where ${finalCondition}`).length === 1)) {
            return yield* invalidState()
          }
          if (input.authorization !== undefined) {
            const final = yield* capture(input.subjectId)

            if (!(final !== undefined && final.now >= now)) return yield* invalidState()
            const expected = mapping.subject.decodeRequirement(expectedPolicy)

            const encodedRequirement = Schema.encodeSync(
              Schema.fromJsonString(AuthenticationRequirement)
            )

            if (!(encodedRequirement(final.snapshot.requirement) === encodedRequirement(expected))) {
              return yield* invalidState()
            }
          }
        }).pipe(
          Effect.provideContext(cryptoServices),
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) => PersistenceMappingError.make({ operation: "decode", cause: error }))
            )
          )
        )
      })
    }

    return accepted ? { _tag: "Accepted" as const, record: next } : reject
  })

  const totpPersistence: TotpPersistence["Service"] = {
    snapshot: (input) =>
      executor.read(
        provide(
          Effect.gen(function*() {
            if (!(input.moduleId === mapping.moduleId)) return yield* invalidState()

            return (yield* capture(input.subjectId))?.snapshot
          })
        )
      ),
    mutate: (original, project) =>
      run(
        Effect.gen(function*() {
          const input = yield* Schema.decodeEffect(Schema.toType(TotpMutation))(original)
          const decision = yield* mutate(input)

          return yield* prepareNativeSession(decision, project)
        })
      )
  }

  return { totpPersistence }
})
