/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"
import {
  AlterTableColumnAlteringBuilder,
  CreateIndexBuilder,
  CreateSchemaBuilder,
  CreateTableBuilder,
  CreateTypeBuilder,
  CreateViewBuilder,
  DeleteQueryBuilder,
  DropIndexBuilder,
  DropSchemaBuilder,
  DropTableBuilder,
  DropTypeBuilder,
  DropViewBuilder,
  InsertQueryBuilder,
  Kysely,
  UpdateQueryBuilder,
  WheneableMergeQueryBuilder
} from "kysely"
import type { KyselyConfig } from "kysely"
import type { EffectKysely } from "../patch.types.js"
import { effectifyWithExecute, effectifyWithSql, patch } from "./patch.js"

/**
 * @internal
 * patch all compilable/executable builders with commit prototypes
 *
 * @warning side effect
 */
patch(AlterTableColumnAlteringBuilder.prototype)
patch(CreateIndexBuilder.prototype)
patch(CreateSchemaBuilder.prototype)
patch(CreateTableBuilder.prototype)
patch(CreateTypeBuilder.prototype)
patch(CreateViewBuilder.prototype)
patch(DropIndexBuilder.prototype)
patch(DropSchemaBuilder.prototype)
patch(DropTableBuilder.prototype)
patch(DropTypeBuilder.prototype)
patch(DropViewBuilder.prototype)
patch(InsertQueryBuilder.prototype)
patch(UpdateQueryBuilder.prototype)
patch(DeleteQueryBuilder.prototype)
patch(WheneableMergeQueryBuilder.prototype)

/**
 * @internal
 * create a Kysely instance from a dialect
 * and using an effect/sql client backend
 */
export const makeWithSql = <DB>(config: KyselyConfig) =>
  Effect.gen(function*() {
    const client = yield* Client.SqlClient

    const db = new Kysely<DB>(config) as unknown as EffectKysely<DB>
    db.withTransaction = client.withTransaction

    // SelectQueryBuilder is not exported from "kysely" so we patch the prototype from it's instance
    const selectPrototype = Object.getPrototypeOf(db.selectFrom("" as any))
    patch(selectPrototype)

    return effectifyWithSql(db, client, ["withTransaction", "compile"])
  })

/**
 * @internal
 * create a Kysely instance from a dialect
 * and using the native kysely driver
 */
export const makeWithExecute = <DB>(config: KyselyConfig) => {
  const db = new Kysely<DB>(config)
  // SelectQueryBuilder is not exported from "kysely" so we patch the prototype from it's instance
  const selectPrototype = Object.getPrototypeOf(db.selectFrom("" as any))
  patch(selectPrototype)
  return effectifyWithExecute(db)
}
