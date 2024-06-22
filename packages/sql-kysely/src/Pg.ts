/**
 * @since 1.0.0
 */
import type { KyselyConfig } from "kysely"
import { DummyDriver, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from "kysely"
import * as internal from "./internal/kysely.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <DB>(config?: Omit<KyselyConfig, "dialect">) =>
  internal.makeWithSql<DB>({
    ...config,
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler()
    }
  })

/**
 * @since 1.0.0
 * @category types
 */
export type * from "./patch.types.js"
