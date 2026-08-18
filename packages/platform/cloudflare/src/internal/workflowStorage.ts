/**
 * Storage glue for the workflow Durable Object. The constructor must stay
 * cheap: open SQLite, ensure the tables, and re-arm the single alarm from the
 * earliest pending clock. No workflow handlers are built here.
 *
 * @internal
 */
import type { SqlStorage } from "@cloudflare/workers-types"

const ddl = [
  `CREATE TABLE IF NOT EXISTS workflow_execution (
    id INTEGER PRIMARY KEY CHECK (id = 0),
    workflow_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    parent_name TEXT,
    parent_execution_id TEXT,
    result TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS workflow_activities (
    key TEXT PRIMARY KEY,
    exit TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workflow_deferreds (
    name TEXT PRIMARY KEY,
    exit TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workflow_clocks (
    name TEXT PRIMARY KEY,
    deferred_name TEXT NOT NULL,
    wake_up INTEGER NOT NULL,
    fired INTEGER NOT NULL DEFAULT 0
  )`
]

/** @internal */
export const ensureWorkflowStorage = (sql: SqlStorage): void => {
  for (const statement of ddl) {
    sql.exec(statement)
  }
}

/** @internal */
export interface ExecutionRow {
  readonly workflowName: string
  readonly payload: string
  readonly parent: { readonly workflowName: string; readonly executionId: string } | undefined
  readonly result: string | undefined
}

/** @internal */
export const loadExecution = (sql: SqlStorage): ExecutionRow | undefined => {
  const row = sql.exec(
    "SELECT workflow_name, payload, parent_name, parent_execution_id, result FROM workflow_execution WHERE id = 0"
  ).toArray()[0]
  if (row === undefined) return undefined
  return {
    workflowName: String(row.workflow_name),
    payload: String(row.payload),
    parent: typeof row.parent_name === "string" && typeof row.parent_execution_id === "string"
      ? { workflowName: row.parent_name, executionId: row.parent_execution_id }
      : undefined,
    result: typeof row.result === "string" ? row.result : undefined
  }
}

/** @internal */
export const createExecution = (
  sql: SqlStorage,
  workflowName: string,
  payload: string,
  parent: { readonly workflowName: string; readonly executionId: string } | undefined
): void => {
  sql.exec(
    `INSERT OR IGNORE INTO workflow_execution (id, workflow_name, payload, parent_name, parent_execution_id, result)
     VALUES (0, ?, ?, ?, ?, NULL)`,
    workflowName,
    payload,
    parent?.workflowName ?? null,
    parent?.executionId ?? null
  )
}

/** @internal */
export const saveResult = (sql: SqlStorage, result: string): void => {
  sql.exec("UPDATE workflow_execution SET result = ? WHERE id = 0", result)
}

/** @internal */
export const loadActivity = (sql: SqlStorage, key: string): string | undefined => {
  const row = sql.exec("SELECT exit FROM workflow_activities WHERE key = ?", key).toArray()[0]
  return row === undefined ? undefined : String(row.exit)
}

/** @internal */
export const saveActivity = (sql: SqlStorage, key: string, exit: string): void => {
  sql.exec("INSERT OR IGNORE INTO workflow_activities (key, exit) VALUES (?, ?)", key, exit)
}

/** @internal */
export const loadDeferred = (sql: SqlStorage, name: string): string | undefined => {
  const row = sql.exec("SELECT exit FROM workflow_deferreds WHERE name = ?", name).toArray()[0]
  return row === undefined ? undefined : String(row.exit)
}

/** @internal */
export const saveDeferred = (sql: SqlStorage, name: string, exit: string): boolean => {
  if (loadDeferred(sql, name) !== undefined) return false
  sql.exec("INSERT OR IGNORE INTO workflow_deferreds (name, exit) VALUES (?, ?)", name, exit)
  return true
}

/** @internal */
export const saveClock = (sql: SqlStorage, name: string, deferredName: string, wakeUp: number): void => {
  sql.exec(
    "INSERT OR IGNORE INTO workflow_clocks (name, deferred_name, wake_up, fired) VALUES (?, ?, ?, 0)",
    name,
    deferredName,
    wakeUp
  )
}

/** @internal */
export const earliestClockWakeUp = (sql: SqlStorage): number | undefined => {
  const row = sql.exec(
    "SELECT min(wake_up) AS wake_up FROM workflow_clocks WHERE fired = 0"
  ).toArray()[0]
  const wakeUp = row?.wake_up
  return typeof wakeUp === "number" ? wakeUp : undefined
}

/** @internal */
export const dueClocks = (
  sql: SqlStorage,
  now: number
): Array<{ readonly name: string; readonly deferredName: string }> =>
  sql.exec(
    "SELECT name, deferred_name FROM workflow_clocks WHERE fired = 0 AND wake_up <= ?",
    now
  ).toArray().map((row) => ({
    name: String(row.name),
    deferredName: String(row.deferred_name)
  }))

/** @internal */
export const markClockFired = (sql: SqlStorage, name: string): void => {
  sql.exec("UPDATE workflow_clocks SET fired = 1 WHERE name = ?", name)
}
