/**
 * @since 1.0.0
 */
import { DummyDriver, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from "kysely"
import { makeFromSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>() =>
  makeFromSql<DB>({
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler()
  })

export type * from "./patch.types.js"
