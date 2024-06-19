/**
 * @since 1.0.0
 */
import { DummyDriver, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from "kysely"
import { makeFromSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>() =>
  makeFromSql<DB>({
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler()
  })

export * from "./patch.types.js"
