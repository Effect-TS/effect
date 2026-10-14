// Entries added from `Redacted` values. Tracking the tuple keeps the mark
// through combinators that reuse entries, such as `remove` and `setAll`.
const redactedEntries = new WeakSet<readonly [string, unknown]>()

/** @internal */
export const markRedacted = (entry: readonly [string, string]): readonly [string, string] => {
  redactedEntries.add(entry)
  return entry
}

/** @internal */
export const isRedactedEntry = (entry: readonly [string, unknown]): boolean => redactedEntries.has(entry)
