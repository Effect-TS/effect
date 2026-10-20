import type { NonEmptyArray } from "../../Array.ts"
import type { Entry } from "../EventJournal.ts"

/** The most entries a remote batch holds. */
export const maxBatchEntries = 100

/** The most payload bytes a remote batch holds, unless it is a single entry. */
export const maxBatchPayloadBytes = 256 * 1024

/**
 * Packs entries into remote batches as they arrive. A batch holds at most
 * `maxBatchEntries` entries or `maxBatchPayloadBytes` of payload, whichever
 * comes first. A single larger entry is a batch on its own.
 */
export class Batcher {
  private current: Array<Entry> = []
  private bytes = 0

  /** Adds an entry, returning the batch it closed, if any. */
  add(entry: Entry): NonEmptyArray<Entry> | undefined {
    const size = entry.payload.byteLength
    let closed: NonEmptyArray<Entry> | undefined
    if (
      this.current.length > 0 &&
      (this.current.length === maxBatchEntries || this.bytes + size > maxBatchPayloadBytes)
    ) {
      closed = this.current as NonEmptyArray<Entry>
      this.current = []
      this.bytes = 0
    }
    this.current.push(entry)
    this.bytes += size
    return closed
  }

  /** Returns the open batch, if any, and starts a new one. */
  flush(): NonEmptyArray<Entry> | undefined {
    if (this.current.length === 0) return undefined
    const closed = this.current as NonEmptyArray<Entry>
    this.current = []
    this.bytes = 0
    return closed
  }
}

/** Packs `entries` into remote batches, as `Batcher` does. */
export const toBatches = (entries: Iterable<Entry>): Array<NonEmptyArray<Entry>> => {
  const batcher = new Batcher()
  const batches: Array<NonEmptyArray<Entry>> = []
  for (const entry of entries) {
    const closed = batcher.add(entry)
    if (closed !== undefined) batches.push(closed)
  }
  const last = batcher.flush()
  if (last !== undefined) batches.push(last)
  return batches
}
