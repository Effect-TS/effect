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
  private readonly stored = new Map<string, Map<string, Group>>()

  constructor(batch: ReadonlyArray<Entry>) {
    this.batch = batch
    let oldestMillis = Infinity
    for (const entry of batch) {
      let byKey = this.stored.get(entry.event)
      if (byKey === undefined) {
        byKey = new Map()
        this.stored.set(entry.event, byKey)
      }
      const group = byKey.get(entry.primaryKey)
      if (group === undefined) {
        byKey.set(entry.primaryKey, { oldestMillis: entry.createdAtMillis, entries: [] })
      } else {
        group.oldestMillis = Math.min(group.oldestMillis, entry.createdAtMillis)
      }
      oldestMillis = Math.min(oldestMillis, entry.createdAtMillis)
    }
    this.oldestMillis = oldestMillis
  }

  get events(): Array<string> {
    return Array.from(this.stored.keys())
  }

  /**
   * The `(event, primaryKey)` pairs in the batch, each with the creation time
   * of its oldest entry. Only stored entries in a pair, created after that
   * time, can conflict.
   */
  *groups(): Iterable<{ readonly event: string; readonly primaryKey: string; readonly oldestMillis: number }> {
    for (const [event, byKey] of this.stored) {
      for (const [primaryKey, group] of byKey) {
        yield { event, primaryKey, oldestMillis: group.oldestMillis }
      }
    }
  }

  add(entry: Entry): void {
    this.stored.get(entry.event)?.get(entry.primaryKey)?.entries.push(entry)
  }

  toBatch(): Array<{ readonly entry: Entry; readonly conflicts: ReadonlyArray<Entry> }> {
    return this.batch.map((entry) => {
      const millis = entry.createdAtMillis
      return {
        entry,
        conflicts: this.stored.get(entry.event)!.get(entry.primaryKey)!.entries.filter((stored) =>
          stored.createdAtMillis > millis
        )
      }
    })
  }
}

interface Group {
  oldestMillis: number
  readonly entries: Array<Entry>
}
