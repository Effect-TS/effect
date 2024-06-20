/**
 * @since 1.0.0
 */
import type { KyselyConfig } from "kysely"
import { DummyDriver, MssqlAdapter, MssqlIntrospector, MssqlQueryCompiler } from "kysely"
import { makeWithSql } from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>(config?: Omit<KyselyConfig, "dialect">) =>
  makeWithSql<DB>({
    ...config,
    dialect: {
      createAdapter: () => new MssqlAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new MssqlIntrospector(db),
      createQueryCompiler: () => new MssqlQueryCompiler()
    }
  })

export type * from "./patch.types.js"
