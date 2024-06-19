/**
 * @since 1.0.0
 */
import { DummyDriver, MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler } from "kysely"
import { makeFromSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>() =>
  makeFromSql<DB>({
    createAdapter: () => new MysqlAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new MysqlIntrospector(db),
    createQueryCompiler: () => new MysqlQueryCompiler()
  })

export * from "./patch.types.js"
