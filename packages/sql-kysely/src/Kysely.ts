/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { Dialect } from "kysely"
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
import { effectifyWithKysely, patch } from "./internal/patch.js"

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
 * @since 1.0.0
 * @category tags
 */
export class KyselyDialect extends Context.Tag("KyselyDialect")<KyselyDialect, Dialect>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>() =>
  Effect.gen(function*() {
    const dialect = yield* KyselyDialect
    const db = new Kysely<DB>({ dialect })
    // ;(db as unknown as EffectKysely<DB>).withTransaction = (callback) =>
    //   Effect.tryPromise({
    //     try: () =>
    //       db.transaction().execute((trx) =>
    //         Effect.runPromise(callback(effectifyWithKysely(trx as unknown as EffectKysely<DB>)))
    //       ),
    //     catch: (e) => new SqlError({ error: e })
    //   })
    // SelectQueryBuilder is not exported from "kysely" so we patch the prototype from it's instance
    const selectPrototype = Object.getPrototypeOf(db.selectFrom("" as any))
    patch(selectPrototype)
    return effectifyWithKysely(db)
  })

export * from "./patch.types.js"
