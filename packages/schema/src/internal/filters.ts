import type * as Schema from "../Schema.js"

/** @internal */
export const GreaterThanTypeId: Schema.GreaterThanTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThan"
) as Schema.GreaterThanTypeId

/** @internal */
export const GreaterThanOrEqualToTypeId: Schema.GreaterThanOrEqualToTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualTo"
) as Schema.GreaterThanOrEqualToTypeId

/** @internal */
export const LessThanTypeId: Schema.LessThanTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThan"
) as Schema.LessThanTypeId

/** @internal */
export const LessThanOrEqualToTypeId: Schema.LessThanOrEqualToTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualTo"
) as Schema.LessThanOrEqualToTypeId

/** @internal */
export const IntTypeId: Schema.IntTypeId = Symbol.for(
  "@effect/schema/TypeId/Int"
) as Schema.IntTypeId

/** @internal */
export const BetweenTypeId: Schema.BetweenTypeId = Symbol.for(
  "@effect/schema/TypeId/Between"
) as Schema.BetweenTypeId

/** @internal */
export const GreaterThanBigintTypeId: Schema.GreaterThanBigIntTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThanBigint"
) as Schema.GreaterThanBigIntTypeId

/** @internal */
export const GreaterThanOrEqualToBigIntTypeId: Schema.GreaterThanOrEqualToBigIntTypeId = Symbol.for(
  "@effect/schema/TypeId/GreaterThanOrEqualToBigint"
) as Schema.GreaterThanOrEqualToBigIntTypeId

/** @internal */
export const LessThanBigIntTypeId: Schema.LessThanBigIntTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThanBigint"
) as Schema.LessThanBigIntTypeId

/** @internal */
export const LessThanOrEqualToBigIntTypeId: Schema.LessThanOrEqualToBigIntTypeId = Symbol.for(
  "@effect/schema/TypeId/LessThanOrEqualToBigint"
) as Schema.LessThanOrEqualToBigIntTypeId

/** @internal */
export const BetweenBigintTypeId: Schema.BetweenBigIntTypeId = Symbol.for(
  "@effect/schema/TypeId/BetweenBigint"
) as Schema.BetweenBigIntTypeId

/** @internal */
export const MinLengthTypeId: Schema.MinLengthTypeId = Symbol.for(
  "@effect/schema/TypeId/MinLength"
) as Schema.MinLengthTypeId

/** @internal */
export const MaxLengthTypeId: Schema.MaxLengthTypeId = Symbol.for(
  "@effect/schema/TypeId/MaxLength"
) as Schema.MaxLengthTypeId

/** @internal */
export const LengthTypeId: Schema.LengthTypeId = Symbol.for(
  "@effect/schema/TypeId/Length"
) as Schema.LengthTypeId

/** @internal */
export const MinItemsTypeId: Schema.MinItemsTypeId = Symbol.for(
  "@effect/schema/TypeId/MinItems"
) as Schema.MinItemsTypeId

/** @internal */
export const MaxItemsTypeId: Schema.MaxItemsTypeId = Symbol.for(
  "@effect/schema/TypeId/MaxItems"
) as Schema.MaxItemsTypeId

/** @internal */
export const ItemsCountTypeId: Schema.ItemsCountTypeId = Symbol.for(
  "@effect/schema/TypeId/ItemsCount"
) as Schema.ItemsCountTypeId

/** @internal */
export const ParseJsonTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/ParseJson")
