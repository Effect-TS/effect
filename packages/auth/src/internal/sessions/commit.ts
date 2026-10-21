import type { CommitJournal, PreparedCommit } from "../hooks/commit.ts"

/**
 * Runs inside the persistence adapter's actual commit journal. It can only prepare
 * an immutable result/event; all cryptography and before hooks run beforehand.
 * Interactive/savepoint owners reuse the outer journal, synchronous owners never
 * suspend, and batch owners allocate final IDs/versions and prepare BEFORE executing the batch.
 * No adapter may invoke this after its physical root commit has returned.
 */
export type PrepareSessionCommit<Record, A> = (
  record: Record,
  journal: CommitJournal
) => PreparedCommit<A>
