import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Filter from "../../Filter.ts"
import * as Migrator from "../../sql/Migrator.ts"
import type * as SqlClient from "../../sql/SqlClient.ts"
import type { SqlError } from "../../sql/SqlError.ts"

/** @internal */
export const runMigrations = (options: {
  readonly loader: Migrator.Loader
  readonly table: string
}): Effect.Effect<void, SqlError | Migrator.MigrationError, SqlClient.SqlClient> =>
  Migrator.make({})(options).pipe(
    Effect.asVoid,
    // `Migrator.make` reports an error raised inside a migration as a
    // `MigrationError` defect. Fail with it instead, leaving other defects.
    Effect.catchCauseFilter(
      Filter.composePassthrough(Cause.findDefect, Filter.instanceOf(Migrator.MigrationError)),
      Effect.fail
    )
  )
