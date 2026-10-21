import * as OAuth from "@effect/auth/OAuth"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

import type { OAuthConnectedMapping } from "../models/oauthConnectedModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { exactSqlText } from "../sqlChange.ts"
import type { SqlExpression, TableModel } from "../tableModel.ts"
import { makeOAuthNativeMutation } from "./nativeMutation.ts"
import { invalidState, oauthIdentityKey, storage } from "./state.ts"

// Physical metadata is checked by the adapter compiler.
export type OAuthNativeConnectedMapping = OAuthConnectedMapping<
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  TableModel,
  unknown,
  TableModel,
  SqlExpression
>

/** @internal */
export const connectedSummary = (context: OAuth.OAuthConnectedTokenContext) =>
  OAuth.snapshotOAuthSync(OAuth.OAuthConnectedSummary, {
    grantId: context.grantId,
    provider: context.identity.provider,
    issuer: context.identity.issuer,
    profileKey: context.configuration.profile.key,
    status: "Active",
    scopes: context.metadata.scopes,
    ...(context.metadata.accessExpiresAtMillis === undefined
      ? {}
      : { accessExpiresAtMillis: context.metadata.accessExpiresAtMillis }),
    useUntilMillis: context.metadata.useUntilMillis,
    ...(context.metadata.profile === undefined ? {} : { profile: context.metadata.profile }),
    remoteRevocation: context.configuration.profile.revocation === "provider" ? "Pending" : "Unsupported"
  })

/** @internal */
export const validConnectedMetadata = (context: OAuth.OAuthConnectedTokenContext, now: number) => {
  const m = context.metadata
  const p = context.configuration.profile

  return (
    p.provider === context.identity.provider &&
    context.configuration.provider === context.identity.provider &&
    context.configuration.issuer === context.identity.issuer &&
    m.obtainedAtMillis <= now &&
    m.useUntilMillis > m.obtainedAtMillis &&
    m.useUntilMillis <= m.obtainedAtMillis + p.maximumAccessLifetimeMillis &&
    (m.accessExpiresAtMillis === undefined || m.useUntilMillis <= m.accessExpiresAtMillis) &&
    m.scopes.every((value) => p.scopes.includes(value)) &&
    m.resources.every((value) => p.resources.includes(value)) &&
    new Set(m.scopes).size === m.scopes.length &&
    new Set(m.resources).size === m.resources.length &&
    (m.refreshUseUntilMillis === undefined ||
      (p.retention === "access-and-refresh" &&
        p.maximumRefreshLifetimeMillis !== undefined &&
        m.refreshUseUntilMillis > m.obtainedAtMillis &&
        m.refreshUseUntilMillis <= m.obtainedAtMillis + p.maximumRefreshLifetimeMillis &&
        (m.refreshExpiresAtMillis === undefined ||
          m.refreshUseUntilMillis <= m.refreshExpiresAtMillis)))
  )
}

/** @internal */
export const makeOAuthNativeConnectedState = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: OAuthNativeConnectedMapping,
  batch: boolean
) {
  const mutation = yield* makeOAuthNativeMutation(tables, mapping, batch)
  const { sql, now } = mutation
  const grant = tables(mapping.grant.table)
  const g = mapping.grant
  const stored = storage(OAuth.OAuthConnectedStoredGrant)
  const summary = storage(OAuth.OAuthConnectedSummary)

  const exact = (key: string, value: unknown) => exactSqlText(sql, grant.column(key), grant.value(key, value))

  const key = (input: OAuth.OAuthConnectedGrantKey, nativeId: unknown) =>
    sql.and([
      exact(g.moduleId, input.moduleId),
      exact(g.grantId, input.grantId),
      sql`${grant.column(g.subjectId)} = ${grant.value(g.subjectId, nativeId)}`
    ])

  const decode = Effect.fnUntraced(function*(
    row: Readonly<Record<string, unknown>>,
    nativeId: unknown
  ) {
    const encoded = row[g.snapshot]

    if (!(Predicate.isString(encoded))) return yield* invalidState()
    const value = stored.decode(encoded)
    const c = value.context
    const identityKey = yield* oauthIdentityKey(c.identity)

    if (
      !(
        row[g.moduleId] === c.moduleId &&
        row[g.grantId] === c.grantId &&
        mapping.subjectId.equals(row[g.subjectId], nativeId) &&
        mapping.subjectId.equals(yield* mapping.subjectId.toNative(c.subjectId), nativeId) &&
        row[g.identityKey] === identityKey &&
        row[g.profileKey] === c.configuration.profile.key &&
        row[g.grantVersion] === c.grantVersion &&
        row[g.tokenVersion] === c.tokenVersion &&
        mapping.clock.decodeInstant(row[g.expiresAt]) ===
          Math.max(c.metadata.useUntilMillis, c.metadata.refreshUseUntilMillis ?? 0)
      )
    ) {
      return yield* invalidState()
    }

    const state = yield* Schema.decodeUnknownEffect(OAuth.OAuthConnectedGrantSnapshot.fields.state)(
      row[g.state]
    )

    if (state === "Refreshing") {
      if (
        !(
          Predicate.isString(row[g.refreshClaimId]) &&
          Predicate.isString(row[g.refreshNextTokenVersion]) &&
          row[g.refreshClaimedAt] !== null &&
          row[g.refreshClaimExpiresAt] !== null
        )
      ) {
        return yield* invalidState()
      }
    } else {
      if (
        !(
          row[g.refreshClaimId] === null &&
          row[g.refreshNextTokenVersion] === null &&
          row[g.refreshClaimedAt] === null &&
          row[g.refreshClaimExpiresAt] === null
        )
      ) {
        return yield* invalidState()
      }
    }

    const snapshot = OAuth.snapshotOAuthSync(OAuth.OAuthConnectedGrantSnapshot, {
      ...value,
      state,
      ...(state === "Refreshing"
        ? { refreshClaimExpiresAtMillis: mapping.clock.decodeInstant(row[g.refreshClaimExpiresAt]) }
        : {})
    })

    return { value, snapshot, row, encoded, identityKey }
  })

  const readGrant = Effect.fnUntraced(function*(
    input: OAuth.OAuthConnectedGrantKey,
    nativeId: unknown,
    locking = false
  ) {
    const rows = yield* sql`select ${grant.fields("grant_")} from ${grant.name} where ${key(input, nativeId)} ${
      locking ? mutation.lock : sql``
    }`

    if (!(rows.length <= 1)) return yield* invalidState()

    return rows[0] === undefined
      ? undefined
      : yield* decode(grant.decode(rows[0], "grant_"), nativeId)
  })

  const readJoined = Effect.fnUntraced(function*(input: OAuth.OAuthConnectedReadInput) {
    if (input.selector === undefined) {
      const captured = yield* mutation.capture(input.subjectId, false)

      return captured === undefined ? undefined : { revision: captured.revision }
    }
    const nativeId = yield* mapping.subjectId.toNative(input.subjectId)
    const s = mutation.subject.as("connected_subject")
    const a = mutation.authority.as("connected_authority")
    const selected = grant.as("connected_grant")

    const selector = input.selector._tag === "Grant"
      ? exactSqlText(
        sql,
        selected.column(g.grantId),
        selected.value(g.grantId, input.selector.grantId)
      )
      : sql.and([
        exactSqlText(
          sql,
          selected.column(g.profileKey),
          selected.value(g.profileKey, input.selector.profileKey)
        ),
        exactSqlText(
          sql,
          selected.column(g.identityKey),
          selected.value(g.identityKey, yield* oauthIdentityKey(input.selector.identity))
        )
      ])

    const rows = yield* sql`select ${s.fields("s_")}, ${a.fields("a_")}, ${selected.fields("g_")}, ${now} as engine_now
      from (select * from ${mutation.subject.name} where ${tables.expression(mapping.subject.activeCondition)}) as ${
      sql("connected_subject")
    }
      join (select * from ${mutation.authority.name} where ${
      tables.expression(mapping.authority.activeCondition)
    }) as ${sql("connected_authority")}
        on ${a.column(mapping.authority.subjectId)} = ${a.value(mapping.authority.subjectId, nativeId)}
      left join ${selected.name} on ${selected.column(g.subjectId)} = ${selected.value(g.subjectId, nativeId)} and ${
      exactSqlText(sql, selected.column(g.moduleId), selected.value(g.moduleId, input.moduleId))
    } and ${selector}
      where ${s.column(mapping.subject.id)} = ${s.value(mapping.subject.id, nativeId)} order by ${
      a.column(mapping.authority.credentialId)
    } limit 65`

    if (rows.length === 0) return undefined

    const revision = yield* mutation.revision(
      s.decode(rows[0]!, "s_"),
      rows.map((row) => a.decode(row, "a_")),
      nativeId
    )

    const found = selected.decode(rows[0]!, "g_")

    if (found[g.grantId] === null) return { revision }
    const decoded = yield* decode(found, nativeId)

    if (input.selector._tag === "Identity") {
      if (
        !(
          storage(OAuth.OAuthExternalIdentity).encode(decoded.value.context.identity) ===
            storage(OAuth.OAuthExternalIdentity).encode(input.selector.identity)
        )
      ) {
        return yield* invalidState()
      }
    }

    return { revision, grant: decoded.snapshot }
  })

  const values = (value: OAuth.OAuthConnectedStoredGrant, nativeId: unknown, identityKey: string) => {
    const c = value.context

    return {
      ...g.encodeInsert({ grant: value, subjectId: nativeId }),
      [g.moduleId]: c.moduleId,
      [g.grantId]: c.grantId,
      [g.subjectId]: nativeId,
      [g.identityKey]: identityKey,
      [g.profileKey]: c.configuration.profile.key,
      [g.grantVersion]: c.grantVersion,
      [g.tokenVersion]: c.tokenVersion,
      [g.state]: "Active",
      [g.snapshot]: stored.encode(value),
      [g.summary]: summary.encode(connectedSummary(c)),
      [g.refreshClaimId]: null,
      [g.refreshNextTokenVersion]: null,
      [g.refreshClaimedAt]: null,
      [g.refreshClaimExpiresAt]: null,
      [g.expiresAt]: mapping.clock.encodeInstant(
        Math.max(c.metadata.useUntilMillis, c.metadata.refreshUseUntilMillis ?? 0)
      )
    }
  }

  const use = (
    nativeId: unknown,
    authorization: OAuth.OAuthConnectedUseAuthorization,
    purpose: "metadata" | "use",
    context?: OAuth.OAuthConnectedTokenContext
  ) => {
    if (
      authorization.purpose !== purpose ||
      (context !== undefined &&
        (context.moduleId !== authorization.moduleId ||
          context.subjectId !== authorization.revision.subjectId ||
          (authorization.grantId !== undefined && authorization.grantId !== context.grantId) ||
          (authorization.profileKey !== undefined &&
            authorization.profileKey !== context.configuration.profile.key)))
    ) {
      return undefined
    }

    return sql.and([
      mutation.authorityCondition(nativeId, authorization.revision),
      sql`${now} < ${authorization.expiresAtMillis}`,
      tables.expression(
        mapping.policy.condition({
          subjectId: nativeId,
          revision: authorization.revision,
          kind: purpose,
          authorization,
          ...(context === undefined ? {} : { grant: context })
        })
      )
    ])
  }

  return {
    ...mutation,
    grant,
    stored,
    summary,
    exact,
    key,
    decode,
    readGrant,
    readJoined,
    values,
    use
  }
})
