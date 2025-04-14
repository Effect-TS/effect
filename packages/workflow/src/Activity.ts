/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/workflow/Activity")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface Activity<
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
> {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly execute: Effect.Effect<Success["Type"], Error["Type"], R>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  R,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(options: {
  readonly name: string
  readonly success?: Success
  readonly error?: Error
  readonly execute: Effect.Effect<Success["Type"], Error["Type"], R>
}): Activity<Success, Error, R> => ({
  [TypeId]: TypeId,
  name: options.name,
  successSchema: options.success ?? Schema.Void as any,
  errorSchema: options.error ?? Schema.Never as any,
  execute: options.execute
})

/**
 * @since 1.0.0
 * @category Requests
 */
export class ActivityRequest extends Schema.Class<ActivityRequest>("@effect/workflow/Activity/ActivityRequest")({
  name: Schema.String,
  attempt: Schema.Number
}) {
  [PrimaryKey.symbol]() {
    return `${this.name}-${this.attempt}`
  }
}
