import type { DatabaseSync, SQLInputValue } from "node:sqlite"
import type { RawAccess } from "rivetkit/db"

const bind = (value: unknown): SQLInputValue =>
  value === undefined ? null : typeof value === "boolean" ? (value ? 1 : 0) : value as SQLInputValue

/**
 * Rivet's `RawAccess` over node:sqlite. Transactions are queued, as in Rivet.
 * By transaction name, `onBegin` can reject a transaction before its body
 * runs, `onCommit` can reject a commit, and `afterCommit` observes a commit
 * and can lose its acknowledgement.
 */
export class SqliteAccess {
  readonly db: RawAccess
  // Returns an error to reject the transaction before BEGIN.
  onBegin: ((name: string | undefined) => Error | undefined) | undefined
  // Returns an error to reject the commit, which rolls the transaction back.
  onCommit: ((name: string | undefined) => Error | undefined) | undefined
  // Returns an error to reject a transaction that did commit.
  afterCommit: ((name: string | undefined) => Error | undefined) | undefined
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
          const name = options?.name
          const beginRejected = this.onBegin?.(name)
          if (beginRejected !== undefined) throw beginRejected
          database.exec("BEGIN")
          let value: T
          try {
            value = await callback(tx)
            const rejected = this.onCommit?.(name)
            if (rejected !== undefined) throw rejected
            database.exec("COMMIT")
          } catch (error) {
            database.exec("ROLLBACK")
            throw error
          }
          const lost = this.afterCommit?.(name)
          if (lost !== undefined) throw lost
          return value
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
