/**
 * @since 1.0.0
 */
import type { KyselyConfig } from "kysely"
import { DummyDriver, MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler } from "kysely"
import { makeWithSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>(config?: Omit<KyselyConfig, "dialect">) =>
  makeWithSql<DB>({
    ...config,
    dialect: {
      createAdapter: () => new MysqlAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new MysqlIntrospector(db),
      createQueryCompiler: () => new MysqlQueryCompiler()
    }
  })

export type * from "./patch.types.js"
