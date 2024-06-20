/**
 * @since 1.0.0
 */
import type { KyselyConfig } from "kysely"
import { DummyDriver, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from "kysely"
import { makeWithSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>(config?: Omit<KyselyConfig, "dialect">) =>
  makeWithSql<DB>({
    ...config,
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler()
    }
  })

export type * from "./patch.types.js"
