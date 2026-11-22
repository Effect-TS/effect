/**
 * The entity actor's SQLite, seen through the two calls the mailbox needs.
 *
 * Rivet's SQLite API is asynchronous. A Cloudflare `transactionSync` block
 * cannot interleave with anything else on the object; here the equivalent is
 * one `c.db.transaction` callback, which Rivet runs while other SQL on the
 * actor waits in a FIFO queue. Every mailbox operation that must be atomic is
 * therefore one `transaction` call that uses only its `tx` executor.
 *
 * @internal
 */
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type { RawAccess } from "rivetkit/db"
import { EntityDatabase as CurrentEntityDatabase, type SqlExecutor } from "../RivetEntityDatabase.ts"

export { CurrentEntityDatabase, type SqlExecutor }

/** @internal */
export interface EntityDatabase extends SqlExecutor {
  /**
   * Runs `body` in one SQLite transaction. A failure or defect rolls it back;
   * a commit Rivet rejects, such as a write from a fenced-off instance, is a
   * defect.
   */
  readonly transaction: <A, E>(name: string, body: (tx: SqlExecutor) => Effect.Effect<A, E>) => Effect.Effect<A, E>
}

class Rollback {
  readonly exit: Exit.Exit<unknown, unknown>
  constructor(exit: Exit.Exit<unknown, unknown>) {
    this.exit = exit
  }
}

const executor = (db: Pick<RawAccess, "execute">): SqlExecutor => ({
  execute: <Row>(sql: string, ...params: ReadonlyArray<unknown>) =>
    Effect.promise(() => db.execute(sql, ...params) as Promise<Array<Row>>)
})

/** @internal */
export const fromRawAccess = (db: RawAccess): EntityDatabase => ({
  ...executor(db),
  transaction: <A, E>(name: string, body: (tx: SqlExecutor) => Effect.Effect<A, E>) =>
    Effect.flatten(Effect.promise(() =>
      db.transaction(async (tx) => {
        const exit = await Effect.runPromiseExit(body(executor(tx)))
        if (Exit.isFailure(exit)) throw new Rollback(exit)
        return exit
      }, { name }).catch((error: unknown) => {
        if (error instanceof Rollback) return error.exit as Exit.Exit<A, E>
        throw error
      })
    ))
})

/**
 * The Cloudflare mailbox DDL without the keep-alive state table. Runs from
 * the actor's `onMigrate` hook on every start.
 *
 * @internal
 */
export const ddl: ReadonlyArray<string> = [
  `CREATE TABLE IF NOT EXISTS cluster_messages (
    request_id TEXT PRIMARY KEY,
    message_id TEXT UNIQUE,
    envelope TEXT NOT NULL,
    discard INTEGER NOT NULL DEFAULT 0,
    processed INTEGER NOT NULL DEFAULT 0,
    last_reply_id TEXT,
    deliver_at INTEGER,
    reply_to TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS cluster_replies (
    reply_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    reply TEXT NOT NULL,
    kind TEXT NOT NULL,
    sequence INTEGER,
    acked INTEGER NOT NULL DEFAULT 0,
    UNIQUE (request_id, sequence)
  )`,
  `CREATE INDEX IF NOT EXISTS cluster_messages_deliver_at_idx
    ON cluster_messages (processed, deliver_at)`,
  `CREATE INDEX IF NOT EXISTS cluster_replies_unacked_idx
    ON cluster_replies (request_id) WHERE kind = 'Chunk' AND acked = 0`
]
