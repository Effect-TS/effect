import type { D1Client } from "@effect/sql-d1/D1Client"
import type { AnyRelations } from "drizzle-orm"
import type { EffectSQLiteD1Database } from "drizzle-orm/effect-d1"
import * as Context from "effect/Context"

/** Application-owned D1 database, including the client that owns native batches. */
export class Database extends Context.Service<
  Database,
  EffectSQLiteD1Database<AnyRelations> & { readonly $client: D1Client }
>()("@effect/auth-persistence-drizzle/D1/Database") {}
