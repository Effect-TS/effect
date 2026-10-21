import { sql } from "drizzle-orm"
import { bigint, check, type PgTable, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { type OAuthProxyColumns, oauthProxyLayer } from "./drizzle/oauthProxy.ts"

/** Export the returned table from your Drizzle Kit schema before applying the Layer. */
const table = (name: string) =>
  pgTable(
    name,
    {
      namespace: text("namespace").notNull(),
      flowId: text("flow_id").notNull(),
      version: text("version").notNull(),
      stage: text("stage").notNull(),
      context: text("context").notNull(),
      expiresAtMillis: bigint("expires_at_millis", { mode: "number" }).notNull(),
      handoffExpiresAtMillis: bigint("handoff_expires_at_millis", { mode: "number" }),
      payload: text("payload").notNull()
    },
    (columns) => [
      primaryKey({ columns: [columns.namespace, columns.flowId] }),
      check(
        `${name}_stage`,
        sql`${columns.stage} in ('Pending', 'Exchanging', 'Ready', 'Consumed')`
      ),
      check(
        `${name}_handoff`,
        sql`(${columns.stage} = 'Ready' and ${columns.handoffExpiresAtMillis} is not null)
    or (${columns.stage} <> 'Ready' and ${columns.handoffExpiresAtMillis} is null)`
      )
    ]
  )

const layer = <T extends PgTable>(table: T, columns?: OAuthProxyColumns<T>) => oauthProxyLayer("pg", table, columns)

export const OAuthProxyPersistence = { table, layer }
