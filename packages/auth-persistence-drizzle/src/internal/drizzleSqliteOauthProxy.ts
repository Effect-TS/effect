import { sql } from "drizzle-orm"
import { check, integer, primaryKey, type SQLiteTable, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { type OAuthProxyColumns, oauthProxyLayer } from "./drizzle/oauthProxy.ts"

/** Export the returned table from your Drizzle Kit schema before applying the Layer. */
const table = (name: string) =>
  sqliteTable(
    name,
    {
      namespace: text("namespace").notNull(),
      flowId: text("flow_id").notNull(),
      version: text("version").notNull(),
      stage: text("stage").notNull(),
      context: text("context").notNull(),
      expiresAtMillis: integer("expires_at_millis").notNull(),
      handoffExpiresAtMillis: integer("handoff_expires_at_millis"),
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

const layer = <T extends SQLiteTable>(table: T, columns?: OAuthProxyColumns<T>) =>
  oauthProxyLayer("sqlite", table, columns)

export const OAuthProxyPersistence = { table, layer }
