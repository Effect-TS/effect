import type * as Order from "../../Order.ts"
import type { Entry } from "../EventJournal.ts"

/**
 * Pairs a batch of incoming entries with the stored entries that conflict with
 * them: same event and primary key, strictly greater id.
 *
 * The batch is sorted by `order` (`Entry.Order`), so it is applied in the same
 * order on every replica. Add the stored entries that may conflict, then call
 * `toBatch` to sort and filter them.
 */
export class ConflictIndex {
  /** The incoming entries in id order. */
  readonly batch: ReadonlyArray<Entry>
  /** Creation time of the oldest incoming entry, for coarse filters. */
  readonly oldestMillis: number
  private readonly order: Order.Order<Entry>
  private readonly stored = new Map<string, Map<string, ConflictGroup>>()

  constructor(batch: ReadonlyArray<Entry>, order: Order.Order<Entry>) {
    this.batch = batch.slice().sort(order)
    this.order = order
    this.oldestMillis = this.batch.length > 0 ? this.batch[0].createdAtMillis : Infinity
    for (const entry of this.batch) {
      let byKey = this.stored.get(entry.event)
      if (byKey === undefined) {
        byKey = new Map()
        this.stored.set(entry.event, byKey)
      }
      if (!byKey.has(entry.primaryKey)) {
        byKey.set(entry.primaryKey, {
          event: entry.event,
          primaryKey: entry.primaryKey,
          oldest: entry,
          entries: []
        })
      }
    }
  }

  get events(): Array<string> {
    return Array.from(this.stored.keys())
  }

  /** The `(event, primaryKey)` groups in the batch. */
  *groups(): Iterable<ConflictGroup> {
    for (const byKey of this.stored.values()) {
      yield* byKey.values()
    }
  }

  add(entry: Entry): void {
    this.stored.get(entry.event)?.get(entry.primaryKey)?.entries.push(entry)
  }

  toBatch(): Array<{ readonly entry: Entry; readonly conflicts: ReadonlyArray<Entry> }> {
    for (const group of this.groups()) {
      group.entries.sort(this.order)
    }
    return this.batch.map((entry) => ({
      entry,
      conflicts: this.stored.get(entry.event)!.get(entry.primaryKey)!.entries.filter((stored) =>
        this.order(stored, entry) > 0
      )
    }))
  }
}

/** An event and primary key in the batch, with the stored entries added for it. */
export interface ConflictGroup {
  readonly event: string
  readonly primaryKey: string
  /** The incoming entry with the lowest id. Only stored entries with a greater id can conflict. */
  readonly oldest: Entry
  readonly entries: Array<Entry>
}
