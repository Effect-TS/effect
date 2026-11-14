/**
 * Compiles every gold plan to SQL for the DuckDB cross-check
 * (sql_oracle.py):
 *
 *   node test/fixtures/dataframe/compile_sql.ts [dialect]
 *
 * Writes .sql/sql-<dialect>.json (git-ignored): per case, the SQL or why it
 * can't compile.
 */
import { Result } from "effect"
import { Sql } from "effect/dataframe"
import * as Fs from "node:fs"
import * as Gold from "../../dataframe/oracle/Gold.ts"
import * as Plan from "../../dataframe/oracle/Plan.ts"

const dialect = (process.argv[2] ?? "duckdb") as Sql.Dialect
const cases = [...Gold.spec().cases, ...Gold.random().cases, ...Gold.extended().cases]
const out = cases.map((c) => {
  const compiled = Sql.compile(Plan.plan(c, false, true), { dialect })
  return Result.isSuccess(compiled)
    ? { id: c.id, sql: compiled.success.sql, columns: compiled.success.columns }
    : { id: c.id, error: compiled.failure.message }
})
const file = new URL(`.sql/sql-${dialect}.json`, import.meta.url)
Fs.writeFileSync(file, JSON.stringify(out) + "\n")
console.log(`${out.filter((c) => "sql" in c).length}/${out.length} plans compiled to ${dialect}`)
