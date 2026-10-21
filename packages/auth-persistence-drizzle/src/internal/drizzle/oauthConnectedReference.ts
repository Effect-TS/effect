import { getTableColumns, sql, type Table } from "drizzle-orm"

import type { OAuthConnectedMapping } from "./oauthConnectedModel.ts"

/** Concrete grant/job references retain ownership after unlink. */
export const oauthConnectedOwnershipReferences = <
  S extends Table,
  AC extends Table,
  O extends Table,
  F extends Table,
  G extends Table,
  N,
  J extends Table
>(
  mapping: OAuthConnectedMapping<S, AC, O, F, G, N, J>
) => ({
  connectedReference: (input: { readonly identityKey: string; readonly subjectId: N }) => {
    const g = mapping.grant
    const columns = getTableColumns(g.table)
    const grant = sql`exists(select 1 from ${g.table} where ${columns[g.identityKey]} = ${input.identityKey} and ${
      columns[g.subjectId]
    } = ${input.subjectId})`

    if (mapping.revocation.mode === "unsupported") return grant
    const j = mapping.revocation.job
    const jobs = getTableColumns(j.table)

    return sql`(${grant}) or exists(select 1 from ${j.table} where ${jobs[j.identityKey]} = ${input.identityKey} and ${
      jobs[j.subjectId]
    } = ${input.subjectId})`
  }
})
