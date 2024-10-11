import type * as Schema from "../../Schema.js"

/** @internal */
export const GreaterThanTypeId: Schema.GreaterThanTypeId = Symbol.for(
  "effect/Schema/TypeId/GreaterThan"
) as Schema.GreaterThanTypeId

/** @internal */
export const GreaterThanOrEqualToTypeId: Schema.GreaterThanOrEqualToTypeId = Symbol.for(
  "effect/Schema/TypeId/GreaterThanOrEqualTo"
) as Schema.GreaterThanOrEqualToTypeId

/** @internal */
export const LessThanTypeId: Schema.LessThanTypeId = Symbol.for(
  "effect/Schema/TypeId/LessThan"
) as Schema.LessThanTypeId

/** @internal */
export const LessThanOrEqualToTypeId: Schema.LessThanOrEqualToTypeId = Symbol.for(
  "effect/Schema/TypeId/LessThanOrEqualTo"
) as Schema.LessThanOrEqualToTypeId

/** @internal */
export const IntTypeId: Schema.IntTypeId = Symbol.for(
  "effect/Schema/TypeId/Int"
) as Schema.IntTypeId

/** @internal */
export const BetweenTypeId: Schema.BetweenTypeId = Symbol.for(
  "effect/Schema/TypeId/Between"
) as Schema.BetweenTypeId

/** @internal */
export const GreaterThanBigintTypeId: Schema.GreaterThanBigIntTypeId = Symbol.for(
  "effect/Schema/TypeId/GreaterThanBigint"
) as Schema.GreaterThanBigIntTypeId

/** @internal */
export const GreaterThanOrEqualToBigIntTypeId: Schema.GreaterThanOrEqualToBigIntTypeId = Symbol.for(
  "effect/Schema/TypeId/GreaterThanOrEqualToBigint"
) as Schema.GreaterThanOrEqualToBigIntTypeId

/** @internal */
export const LessThanBigIntTypeId: Schema.LessThanBigIntTypeId = Symbol.for(
  "effect/Schema/TypeId/LessThanBigint"
) as Schema.LessThanBigIntTypeId

/** @internal */
export const LessThanOrEqualToBigIntTypeId: Schema.LessThanOrEqualToBigIntTypeId = Symbol.for(
  "effect/Schema/TypeId/LessThanOrEqualToBigint"
) as Schema.LessThanOrEqualToBigIntTypeId

/** @internal */
export const BetweenBigintTypeId: Schema.BetweenBigIntTypeId = Symbol.for(
  "effect/Schema/TypeId/BetweenBigint"
) as Schema.BetweenBigIntTypeId

/** @internal */
export const MinLengthTypeId: Schema.MinLengthTypeId = Symbol.for(
  "effect/Schema/TypeId/MinLength"
) as Schema.MinLengthTypeId

/** @internal */
export const MaxLengthTypeId: Schema.MaxLengthTypeId = Symbol.for(
  "effect/Schema/TypeId/MaxLength"
) as Schema.MaxLengthTypeId

/** @internal */
export const LengthTypeId: Schema.LengthTypeId = Symbol.for(
  "effect/Schema/TypeId/Length"
) as Schema.LengthTypeId

/** @internal */
export const MinItemsTypeId: Schema.MinItemsTypeId = Symbol.for(
  "effect/Schema/TypeId/MinItems"
) as Schema.MinItemsTypeId

/** @internal */
export const MaxItemsTypeId: Schema.MaxItemsTypeId = Symbol.for(
  "effect/Schema/TypeId/MaxItems"
) as Schema.MaxItemsTypeId

/** @internal */
export const ItemsCountTypeId: Schema.ItemsCountTypeId = Symbol.for(
  "effect/Schema/TypeId/ItemsCount"
) as Schema.ItemsCountTypeId

/** @internal */
export const ParseJsonTypeId: unique symbol = Symbol.for("effect/Schema/TypeId/ParseJson")
