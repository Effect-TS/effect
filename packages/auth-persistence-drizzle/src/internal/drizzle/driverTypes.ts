import type { AnyRelations } from "drizzle-orm"
import type { EffectSQLiteD1Database } from "drizzle-orm/effect-d1"
import type { EffectLibsqlDatabase } from "drizzle-orm/effect-libsql"
import type { EffectMysql2Database } from "drizzle-orm/effect-mysql2"
import type { EffectPgDatabase as PgliteDatabase } from "drizzle-orm/effect-pglite"
import type { EffectPgDatabase as PostgresDatabase } from "drizzle-orm/effect-postgres"
import type { EffectSQLiteBunDatabase } from "drizzle-orm/effect-sqlite-bun"
import type { EffectSQLiteNodeDatabase } from "drizzle-orm/effect-sqlite-node"
import type { EffectSQLiteWasmDatabase } from "drizzle-orm/effect-sqlite-wasm"

import type { DatabaseValue } from "./sqliteDoDatabase.ts"

export type NativeDriverDatabase =
  | EffectSQLiteD1Database<AnyRelations>
  | EffectLibsqlDatabase<AnyRelations>
  | EffectMysql2Database<AnyRelations>
  | PgliteDatabase<AnyRelations>
  | PostgresDatabase<AnyRelations>
  | EffectSQLiteBunDatabase<AnyRelations>
  | EffectSQLiteNodeDatabase<AnyRelations>
  | EffectSQLiteWasmDatabase<AnyRelations>
  | DatabaseValue<AnyRelations>

export type NativeDriverTransaction<D extends NativeDriverDatabase> = Parameters<
  Parameters<D["transaction"]>[0]
>[0]
