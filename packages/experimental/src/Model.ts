/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as DateTime from "effect/DateTime"
import type { LazyArg } from "effect/Function"
import * as VariantSchema from "./VariantSchema.js"

export const {
  /**
   * @since 1.0.0
   * @category constructors
   */
  Class,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Field,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Struct
} = VariantSchema.factory({
  variants: ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"],
  defaultVariant: "select"
})

/**
 * @since 1.0.0
 * @category models
 */
export interface PrimaryKey<S extends Schema.Schema.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly update: S
    readonly json: S
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const PrimaryKey = <S extends Schema.Schema.All>(
  schema: S
): PrimaryKey<S> =>
  Field({
    select: schema,
    update: schema,
    json: schema
  })

/**
 * @since 1.0.0
 * @category models
 */
export interface FieldNoInsert<S extends Schema.Schema.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly update: S
    readonly json: S
    readonly jsonUpdate: S
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const FieldNoInsert = <S extends Schema.Schema.All>(
  schema: S
): FieldNoInsert<S> =>
  Field({
    select: schema,
    update: schema,
    json: schema,
    jsonUpdate: schema
  })

/**
 * @since 1.0.0
 * @category models
 */
export interface FieldNoJson<S extends Schema.Schema.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly insert: S
    readonly update: S
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const FieldNoJson = <S extends Schema.Schema.All>(
  schema: S
): FieldNoJson<S> =>
  Field({
    select: schema,
    insert: schema,
    update: schema
  })

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeFromDate extends
  Schema.transform<
    typeof Schema.ValidDateFromSelf,
    typeof Schema.DateTimeUtcFromSelf
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeFromDate: DateTimeFromDate = Schema.transform(
  Schema.ValidDateFromSelf,
  Schema.DateTimeUtcFromSelf,
  {
    decode: DateTime.unsafeFromDate,
    encode: DateTime.toDateUtc
  }
)

const DateTimeFromDateWithNow = DateTimeFromDate.pipe(
  Schema.optionalWith({ default: DateTime.unsafeNow })
)

const DateTimeWithNow = Schema.DateTimeUtc.pipe(
  Schema.optionalWith({ default: DateTime.unsafeNow })
)

/**
 * @since 1.0.0
 * @category models
 */
export interface CreatedAt extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc
    readonly insert: Schema.optionalWith<
      typeof Schema.DateTimeUtc,
      { default: LazyArg<DateTime.Utc> }
    >
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const CreatedAt: CreatedAt = Field({
  select: Schema.DateTimeUtc,
  insert: DateTimeWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface CreatedAtFromDate extends
  VariantSchema.Field<{
    readonly select: DateTimeFromDate
    readonly insert: Schema.optionalWith<
      DateTimeFromDate,
      { default: LazyArg<DateTime.Utc> }
    >
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const CreatedAtFromDate: CreatedAtFromDate = Field({
  select: DateTimeFromDate,
  insert: DateTimeFromDateWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface UpdatedAt extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc
    readonly insert: Schema.optionalWith<
      typeof Schema.DateTimeUtc,
      { default: LazyArg<DateTime.Utc> }
    >
    readonly update: Schema.optionalWith<
      typeof Schema.DateTimeUtc,
      { default: LazyArg<DateTime.Utc> }
    >
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const UpdatedAt: UpdatedAt = Field({
  select: Schema.DateTimeUtc,
  insert: DateTimeWithNow,
  update: DateTimeWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface UpdatedAtFromDate extends
  VariantSchema.Field<{
    readonly select: DateTimeFromDate
    readonly insert: Schema.optionalWith<
      DateTimeFromDate,
      { default: LazyArg<DateTime.Utc> }
    >
    readonly update: Schema.optionalWith<
      DateTimeFromDate,
      { default: LazyArg<DateTime.Utc> }
    >
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const UpdatedAtFromDate: UpdatedAtFromDate = Field({
  select: DateTimeFromDate,
  insert: DateTimeFromDateWithNow,
  update: DateTimeFromDateWithNow,
  json: Schema.DateTimeUtc
})
