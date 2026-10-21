import { snapshotOAuth } from "@effect/auth/OAuth"
import { SecurityRevision } from "@effect/auth/Sessions"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"

import type { OAuthAuthorityTable, OAuthCredentialTable, OAuthOwnershipTable } from "../models/oauthModel.ts"
import type { NativeSqlTables } from "../nativeSqlTable.ts"
import { makeConditionalSqlInsert } from "../sessionNativeRecord.ts"
import { exactSqlText } from "../sqlChange.ts"
import { makeSqlCommitExecutor, SqlBatchCommit } from "../sqlCommit.ts"
import type { TableModel } from "../tableModel.ts"
import { IdentityImport, IdentityImports, ImportedIdentity } from "./identityImport.ts"
import { makeOAuthNativeMutation } from "./nativeMutation.ts"
import { makeOAuthNativeState, type OAuthNativeReadMapping } from "./nativeState.ts"
import { nonce, oauthIdentityKey, unavailable } from "./state.ts"

type ImportMapping = Omit<OAuthNativeReadMapping, "ownership" | "credential" | "authority"> & {
  readonly ownership: OAuthOwnershipTable<TableModel, unknown>
  readonly credential: OAuthCredentialTable<TableModel, unknown>
  readonly authority: OAuthAuthorityTable<TableModel, unknown>
}

/** @internal */
export const makeNativeOAuthIdentityImports = Effect.fnUntraced(function*(
  tables: NativeSqlTables,
  mapping: ImportMapping
) {
  const batch = yield* SqlBatchCommit
  const executor = yield* makeSqlCommitExecutor(unavailable)
  const conditionalInsert = yield* makeConditionalSqlInsert()
  const cryptoServices = Context.make(SecureRandom.SecureRandom, yield* SecureRandom.SecureRandom).pipe(
    Context.add(Digest.Digest, yield* Digest.Digest)
  )
  const state = yield* makeOAuthNativeState(tables, mapping)
  const mutation = yield* makeOAuthNativeMutation(tables, mapping, batch !== undefined)
  const { sql, subject, authority } = mutation
  const s = mapping.subject
  const c = mapping.credential
  const a = mapping.authority
  const credential = tables(c.table)

  const exact = (key: string, value: unknown) => exactSqlText(sql, credential.column(key), credential.value(key, value))

  const importIdentity: IdentityImports["Service"]["importIdentity"] = (original) => {
    const work = Effect.gen(function*() {
      const input = yield* snapshotOAuth(IdentityImport, original)
      const current = yield* mutation.captureSubject(input.subjectId, true)

      if (current === undefined) return yield* unavailable()
      const key = yield* oauthIdentityKey(input)

      const found = yield* sql`select 1 from ${credential.name} where ${exact(c.identityKey, key)} limit 2`

      if (found.length > 1) return yield* unavailable()
      if (found.length !== 0) {
        const existing = yield* state.resolve(input.moduleId, input)

        if (existing === undefined || existing.revision.subjectId !== input.subjectId) {
          return yield* unavailable()
        }
        // D1 repeats the observed credential and subject revision in its physical batch.
        yield* mutation.assert(
          sql.and([
            mutation.authorityCondition(current.nativeId, existing.revision),
            sql`exists(select 1 from ${credential.name} where ${exact(c.identityKey, key)} and ${
              exact(c.credentialId, existing.credentialId)
            } and ${exact(c.credentialRevision, existing.credentialRevision)} and ${
              tables.expression(c.activeCondition)
            })`,
            sql`exists(select 1 from ${mutation.ownership.name} where ${
              mutation.ownerCondition(key, current.nativeId)
            })`
          ])
        )

        return yield* snapshotOAuth(ImportedIdentity, existing)
      }

      // A subject may have no methods yet. Locking it still serializes import with
      // account-management mutations; every new factor advances securityRevision.
      const subjectCondition = mutation.subjectCondition(current.nativeId, current)
      const before = sql`exists(select 1 from ${subject.name} where ${subjectCondition})`

      const factors = yield* sql`select 1 from ${authority.name} where ${authority.column(a.subjectId)} = ${
        authority.value(a.subjectId, current.nativeId)
      } and ${tables.expression(a.activeCondition)} limit 64`

      if (factors.length >= 64) return yield* unavailable()
      const identityKey = yield* mutation.ensureOwnership(input, current.nativeId)

      if (identityKey === undefined) return yield* unavailable()
      const credentialId = yield* nonce
      const credentialRevision = SecurityRevision.make(yield* nonce)
      const securityRevision = SecurityRevision.make(yield* nonce)

      const login = {
        ...c.encodeInsert({
          moduleId: input.moduleId,
          subjectId: current.nativeId,
          identityKey,
          credentialId,
          credentialRevision
        }),
        [c.moduleId]: input.moduleId,
        [c.subjectId]: current.nativeId,
        [c.identityKey]: identityKey,
        [c.credentialId]: credentialId,
        [c.credentialRevision]: credentialRevision
      }

      const factor = {
        ...a.encodeInsert({
          subjectId: current.nativeId,
          credentialId,
          revision: credentialRevision
        }),
        [a.subjectId]: current.nativeId,
        [a.credentialId]: credentialId,
        [a.revision]: credentialRevision
      }

      if (!c.isActiveStatus(login[c.status]) || !a.isActiveStatus(factor[a.status])) {
        return yield* unavailable()
      }
      if ((yield* mutation.change(yield* conditionalInsert(credential, login, before))) !== 1) {
        return yield* unavailable()
      }
      if ((yield* mutation.change(yield* conditionalInsert(authority, factor, before))) !== 1) {
        return yield* unavailable()
      }
      if (
        (yield* mutation.change(
          sql`${subject.update({ [s.securityRevision]: securityRevision })} where ${subjectCondition}`
        )) !== 1
      ) {
        return yield* unavailable()
      }

      return yield* snapshotOAuth(ImportedIdentity, { credentialId, credentialRevision })
    }).pipe(Effect.provideContext(cryptoServices))

    return batch === undefined
      ? executor.run(work)
      : executor.batch(work).pipe(Effect.provideService(SqlBatchCommit, batch))
  }

  return IdentityImports.of({ importIdentity })
})
