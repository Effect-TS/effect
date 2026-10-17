import type { Entry } from "../EventJournal.ts"

/**
 * Pairs a batch of incoming entries with the stored entries that conflict with
 * them: same event and primary key, strictly newer.
 *
 * Add the stored entries that may conflict, in the order conflicts should be
 * reported, then call `toBatch`.
 */
export class ConflictIndex {
  readonly batch: ReadonlyArray<Entry>
  readonly oldestMillis: number
  private readonly stored = new Map<string, Map<string, Array<Entry>>>()

  constructor(batch: ReadonlyArray<Entry>) {
    this.batch = batch
    let oldestMillis = Infinity
    for (const entry of batch) {
      let byKey = this.stored.get(entry.event)
      if (byKey === undefined) {
        byKey = new Map()
        this.stored.set(entry.event, byKey)
      }
      if (!byKey.has(entry.primaryKey)) {
        byKey.set(entry.primaryKey, [])
      }
      oldestMillis = Math.min(oldestMillis, entry.createdAtMillis)
    }
    this.oldestMillis = oldestMillis
  }

  get events(): Iterable<string> {
    return this.stored.keys()
  }

  /** Whether a stored entry with this event and key can conflict with the batch. */
  wants(event: string, primaryKey: string): boolean {
    return this.stored.get(event)?.has(primaryKey) === true
  }

  add(entry: Entry): void {
    this.stored.get(entry.event)?.get(entry.primaryKey)?.push(entry)
  }

  toBatch(): Array<{ readonly entry: Entry; readonly conflicts: ReadonlyArray<Entry> }> {
    return this.batch.map((entry) => {
      const millis = entry.createdAtMillis
      return {
        entry,
        conflicts: this.stored.get(entry.event)!.get(entry.primaryKey)!.filter((stored) =>
          stored.createdAtMillis > millis
        )
      }
    })
  }
}
