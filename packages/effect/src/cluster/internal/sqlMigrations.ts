import * as Effect from "../../Effect.ts"
import { constVoid } from "../../Function.ts"
import * as Migrator from "../../sql/Migrator.ts"
import * as SqlClient from "../../sql/SqlClient.ts"

/**
 * Runs SQL storage migrations, failing first on dialects without storage SQL,
 * because `Migrator` also accepts ClickHouse and would query the database.
 *
 * @internal
 */
export const runStorageMigrations = (
  loader: Migrator.Loader,
  table: string
): Effect.Effect<void, never, SqlClient.SqlClient> =>
  SqlClient.SqlClient.use((sql) => {
    sql.onDialect({ sqlite: constVoid, pg: constVoid, mysql: constVoid, mssql: constVoid })
    return Migrator.make({})({ loader, table })
  }).pipe(Effect.asVoid, Effect.orDie)
