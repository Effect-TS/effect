import type { DatabaseSync, SQLInputValue } from "node:sqlite"
import type { RawAccess } from "rivetkit/db"

const bind = (value: unknown): SQLInputValue =>
  value === undefined ? null : typeof value === "boolean" ? (value ? 1 : 0) : value as SQLInputValue

/**
 * Rivet's `RawAccess` over node:sqlite. Transactions are queued, as in Rivet,
 * `onCommit` can reject a commit and `afterCommit` observes one, by
 * transaction name.
 */
export class SqliteAccess {
  readonly db: RawAccess
  // Returns an error to reject the commit, which rolls the transaction back.
  onCommit: ((name: string | undefined) => Error | undefined) | undefined
  afterCommit: ((name: string | undefined) => void) | undefined
  #queue: Promise<unknown> = Promise.resolve()

  constructor(readonly database: DatabaseSync) {
    const execute = async (query: string, ...args: Array<unknown>) => {
      const statement = database.prepare(query)
      const params = args.map(bind)
      if (statement.columns().length === 0) {
        statement.run(...params)
        return []
      }
      return statement.all(...params)
    }
    const tx = {
      execute,
      transaction: () => Promise.reject(new Error("nested transactions are not supported")),
      close: () => Promise.resolve()
    } as unknown as RawAccess
    this.db = {
      execute: (query: string, ...args: Array<unknown>) => this.#serial(() => execute(query, ...args)),
      transaction: <T>(callback: (tx: RawAccess) => Promise<T> | T, options?: { readonly name?: string }) =>
        this.#serial(async () => {
          database.exec("BEGIN")
          try {
            const value = await callback(tx)
            const rejected = this.onCommit?.(options?.name)
            if (rejected !== undefined) throw rejected
            database.exec("COMMIT")
            this.afterCommit?.(options?.name)
            return value
          } catch (error) {
            database.exec("ROLLBACK")
            throw error
          }
        }),
      close: () => Promise.resolve()
    } as unknown as RawAccess
  }

  #serial<T>(f: () => Promise<T>): Promise<T> {
    const next = this.#queue.then(f, f)
    this.#queue = next.catch(() => undefined)
    return next
  }
}
