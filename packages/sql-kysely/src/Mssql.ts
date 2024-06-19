/**
 * @since 1.0.0
 */
import { DummyDriver, MssqlAdapter, MssqlIntrospector, MssqlQueryCompiler } from "kysely"
import { makeFromSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>() =>
  makeFromSql<DB>({
    createAdapter: () => new MssqlAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new MssqlIntrospector(db),
    createQueryCompiler: () => new MssqlQueryCompiler()
  })

export * from "./patch.types.js"
