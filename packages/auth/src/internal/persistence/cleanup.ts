import * as Schema from "effect/Schema"

export const CleanupLimit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000 }))

export type CleanupLimit = typeof CleanupLimit.Type

export const CleanupResult = Schema.Struct({
  removed: Schema.Natural,
  /** The batch reached its limit. Another call may remove zero records. */
  hasMore: Schema.Boolean
})

export type CleanupResult = typeof CleanupResult.Type
