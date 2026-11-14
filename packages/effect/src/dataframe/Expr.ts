/**
 * Column expressions: typed, inspectable descriptions of a computation over
 * the columns of a query.
 *
 * **Mental model**
 *
 * - An `Expr<A>` describes one value per row of type `A`. `A` includes
 *   `null` when the value can be missing.
 * - Expressions are data: a typed wrapper around a `Plan.Expression`
 *   ({@link toPlan}, {@link fromPlan}). `Query` functions take a callback
 *   that receives one typed reference per column (`c.temp`, `c.city`) and
 *   returns expressions; the callback runs once, when the query is built.
 *   The resulting tree runs over whole columns at a time.
 * - Every function is dual: `Expr.gt(c.temp, 20)` and
 *   `c.temp.pipe(Expr.gt(20))` build the same expression. Plain values in
 *   argument position are literals.
 * - Missing values propagate: an operation on `null` gives `null`.
 *   `and`/`or` use three-valued logic (`false && null` is `false`).
 * - An {@link Aggregate} reduces many rows to one (`sum`, `mean`, …). It is
 *   only accepted by `Query.agg` and `Query.aggregate`.
 *
 * **Details**
 *
 * The semantics follow Polars:
 *
 * - Float comparisons use a total order: `NaN` equals `NaN` and is greater
 *   than every other number. `-0` equals `0`.
 * - Strings compare by Unicode code point (UTF-8 byte order).
 * - Integer arithmetic wraps on overflow; `divide` is true division and
 *   returns a float; `floorDivide` and `mod` round towards negative infinity,
 *   and an integer division by zero gives `null`.
 * - An integer literal takes the integer type of the column it meets
 *   (`c.int8Column + 1` stays Int8).
 *
 * **Example** (Building expressions)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const Reading = Schema.Struct({ city: Schema.String, temp: Schema.Number, rain: Schema.NullOr(Schema.Number) })
 * const df = DataFrame.fromRows(Reading, [
 *   { city: "Vienna", temp: 21.5, rain: 0 },
 *   { city: "Berlin", temp: 26.5, rain: null }
 * ])
 *
 * const query = Query.from(df).pipe(
 *   Query.select((c) => ({
 *     city: c.city,
 *     fahrenheit: c.temp.pipe(Expr.multiply(1.8), Expr.add(32)),
 *     wet: Expr.gt(c.rain, 0)
 *   }))
 * )
 *
 * const rows = DataFrame.toRows(Effect.runSync(query))
 * rows[0] // => { city: "Vienna", fahrenheit: 70.7, wet: false }
 * rows[1] // => { city: "Berlin", fahrenheit: 79.7, wet: null }
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import type * as BigDecimal from "../BigDecimal.ts"
import type * as DateTime from "../DateTime.ts"
import type * as Duration from "../Duration.ts"
import { dual } from "../Function.ts"
import type { Pipeable } from "../Pipeable.ts"
import type * as Types from "../Types.ts"
import * as internal from "./internal/expr.ts"
import type * as Plan from "./Plan.ts"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Identifies values of this module's main type.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.5
 */
export const TypeId: "~effect/dataframe/Expr" = internal.ExprTypeId

/**
 * A per-row expression whose value has type `A`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Expr<out A> extends Pipeable {
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
  }
}

/**
 * Identifies aggregate expressions.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.5
 */
export const AggregateTypeId: "~effect/dataframe/Expr/Aggregate" = internal.AggregateTypeId

/**
 * An expression that reduces the rows of a group to one value of type `A`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Aggregate<out A> extends Pipeable {
  readonly [AggregateTypeId]: {
    readonly _A: Types.Covariant<A>
  }
}

/**
 * A sort key: an expression and a direction.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface SortOrder<out A> {
  readonly expr: Expr<A>
  readonly descending: boolean
}

/**
 * An expression or a plain value (a literal).
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Input<A> = Expr<A> | A

/**
 * The value type of an expression or aggregate.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Type<E> = E extends Expr<infer A> ? A : E extends Aggregate<infer A> ? A : never

/**
 * `null` when `A` includes it.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Nullish<A> = null extends A ? null : never

/**
 * The widened primitive of `A`: what `A` can be compared with.
 *
 * @stability experimental
 * @category type-level
 * @since 4.1.5
 */
export type Base<A> = [NonNullable<A>] extends [never] ? never
  : NonNullable<A> extends number ? number
  : NonNullable<A> extends bigint ? bigint
  : NonNullable<A> extends string ? string
  : NonNullable<A> extends boolean ? boolean
  : NonNullable<A>

type Numeric = number | bigint | BigDecimal.BigDecimal
/** The numeric family of `A`: bigint, BigDecimal or number. */
type NumericOf<A> = NonNullable<A> extends bigint ? bigint
  : NonNullable<A> extends BigDecimal.BigDecimal ? BigDecimal.BigDecimal
  : number
type InputType<I> = I extends Expr<infer A> ? A : I

/**
 * Names accepted by {@link cast}, and the value type each produces.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface CastTargets {
  readonly Int8: number
  readonly Int16: number
  readonly Int32: number
  readonly Int64: bigint
  readonly UInt8: number
  readonly UInt16: number
  readonly UInt32: number
  readonly UInt64: bigint
  readonly Float32: number
  readonly Float64: number
  readonly Utf8: string
  readonly Bool: boolean
  readonly Date: DateTime.Utc
  readonly "Timestamp[s]": DateTime.Utc
  readonly "Timestamp[ms]": DateTime.Utc
  readonly "Timestamp[us]": DateTime.Utc
  readonly "Timestamp[ns]": DateTime.Utc
  readonly "Duration[s]": Duration.Duration
  readonly "Duration[ms]": Duration.Duration
  readonly "Duration[us]": Duration.Duration
  readonly "Duration[ns]": Duration.Duration
}

/**
 * Returns `true` for expressions.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isExpr = (u: unknown): u is Expr<unknown> => internal.isExpr(u) && !internal.isAggregate(u)

/**
 * Returns `true` for aggregate expressions.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isAggregate = (u: unknown): u is Aggregate<unknown> => internal.isAggregate(u)

/**
 * The expression as plan data.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const toPlan = (self: Expr<unknown> | Aggregate<unknown>): Plan.Expression =>
  (self as unknown as internal.Handle).node

/**
 * An expression from plan data, with an unknown value type. Aggregate calls
 * become aggregates.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const fromPlan: {
  (expression: Plan.AggregateCall): Aggregate<unknown>
  (expression: Plan.Expression): Expr<unknown>
} = (expression: Plan.Expression): any =>
  expression._tag === "AggregateCall" ? internal.makeAggregate(expression) : internal.makeExpr(expression)

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * A constant. Integers between -2^31 and 2^31 - 1 adopt the integer type of
 * the column they meet; other numbers are Float64; bigints are Int64.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const lit = <
  const A extends number | bigint | string | boolean | DateTime.Utc | Duration.Duration | BigDecimal.BigDecimal | null
>(value: A): Expr<Base<A> | Nullish<A>> => internal.makeExpr(internal.literalNode(value))

// -----------------------------------------------------------------------------
// Arithmetic
// -----------------------------------------------------------------------------

type ArithResult<A, B> = Expr<NumericOf<A> | Nullish<A> | Nullish<B>>

const binary = (fn: Plan.FunctionName) =>
  dual(2, (self: unknown, that: unknown) => internal.call(fn, [self, that])) as any

/**
 * `self + that`. Integers wrap on overflow.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const add: {
  <B extends Numeric | null>(
    that: Input<B>
  ): <A extends NumericOf<B> | null>(self: Expr<A>) => ArithResult<A, B>
  <B extends Duration.Duration | null>(
    that: Input<B>
  ): <A extends DateTime.Utc | Duration.Duration | null>(
    self: Expr<A>
  ) => Expr<NonNullable<A> | Nullish<A> | Nullish<B>>
  <A extends Numeric | null, B extends Base<A> | null>(self: Expr<A>, that: Input<B>): ArithResult<A, B>
  <A extends DateTime.Utc | Duration.Duration | null, B extends Duration.Duration | null>(
    self: Expr<A>,
    that: Input<B>
  ): Expr<NonNullable<A> | Nullish<A> | Nullish<B>>
} = binary("add")

/**
 * `self - that`. Integers wrap on overflow.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const subtract: {
  <B extends Numeric | null>(
    that: Input<B>
  ): <A extends NumericOf<B> | null>(self: Expr<A>) => ArithResult<A, B>
  <B extends DateTime.Utc | null>(
    that: Input<B>
  ): <A extends DateTime.Utc | null>(self: Expr<A>) => Expr<Duration.Duration | Nullish<A> | Nullish<B>>
  <B extends Duration.Duration | null>(
    that: Input<B>
  ): <A extends DateTime.Utc | Duration.Duration | null>(
    self: Expr<A>
  ) => Expr<NonNullable<A> | Nullish<A> | Nullish<B>>
  <A extends Numeric | null, B extends Base<A> | null>(self: Expr<A>, that: Input<B>): ArithResult<A, B>
  <A extends DateTime.Utc | null, B extends DateTime.Utc | null>(
    self: Expr<A>,
    that: Input<B>
  ): Expr<Duration.Duration | Nullish<A> | Nullish<B>>
  <A extends DateTime.Utc | Duration.Duration | null, B extends Duration.Duration | null>(
    self: Expr<A>,
    that: Input<B>
  ): Expr<NonNullable<A> | Nullish<A> | Nullish<B>>
} = binary("subtract")

/**
 * `self * that`. Integers wrap on overflow.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const multiply: {
  <B extends Numeric | null>(
    that: Input<B>
  ): <A extends NumericOf<B> | null>(self: Expr<A>) => ArithResult<A, B>
  <A extends Numeric | null, B extends Base<A> | null>(self: Expr<A>, that: Input<B>): ArithResult<A, B>
} = binary("multiply")

/**
 * True division: always a float (`7 / 2` is `3.5`). Division by zero gives
 * an infinity or NaN.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const divide: {
  <B extends number | null>(
    that: Input<B>
  ): <A extends number | null>(self: Expr<A>) => Expr<number | Nullish<A> | Nullish<B>>
  <A extends number | null, B extends number | null>(
    self: Expr<A>,
    that: Input<B>
  ): Expr<number | Nullish<A> | Nullish<B>>
} = binary("divide")

/**
 * Division rounded towards negative infinity. Integer division by zero
 * gives `null`.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const floorDivide: {
  <B extends Numeric | null>(
    that: Input<B>
  ): <A extends NumericOf<B> | null>(self: Expr<A>) => Expr<Base<A> | null>
  <A extends Numeric | null, B extends Base<A> | null>(self: Expr<A>, that: Input<B>): Expr<Base<A> | null>
} = binary("floorDivide")

/**
 * The remainder of {@link floorDivide}: it has the sign of the divisor
 * (`-7 mod 3` is `2`). Integer division by zero gives `null`.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const mod: {
  <B extends Numeric | null>(
    that: Input<B>
  ): <A extends NumericOf<B> | null>(self: Expr<A>) => Expr<Base<A> | null>
  <A extends Numeric | null, B extends Base<A> | null>(self: Expr<A>, that: Input<B>): Expr<Base<A> | null>
} = binary("mod")

/**
 * `-self`.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const negate = <A extends Numeric | null>(self: Expr<A>): Expr<A> => internal.call("negate", [self])

/**
 * The absolute value.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const abs = <A extends Numeric | null>(self: Expr<A>): Expr<A> => internal.call("abs", [self])

/**
 * The square root, as a float.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const sqrt = <A extends number | null>(self: Expr<A>): Expr<number | Nullish<A>> => internal.call("sqrt", [self])

/**
 * Rounds to `decimals` places (default 0), halves to even.
 *
 * @stability experimental
 * @category arithmetic
 * @since 4.1.5
 */
export const round: {
  (decimals?: number): <A extends number | null>(self: Expr<A>) => Expr<A>
  <A extends number | null>(self: Expr<A>, decimals?: number): Expr<A>
} = dual(
  (args) => isExpr(args[0]),
  (self: Expr<unknown>, decimals = 0) => internal.call("round", [self], { decimals })
) as any

// -----------------------------------------------------------------------------
// Comparisons
// -----------------------------------------------------------------------------

type Comparison = {
  <B>(that: Input<B>): <A extends Base<B> | null>(self: Expr<A>) => Expr<boolean | Nullish<A> | Nullish<B>>
  <A, B extends Base<A> | null>(self: Expr<A>, that: Input<B>): Expr<boolean | Nullish<A> | Nullish<B>>
}

/**
 * `self === that`. `null` when either side is `null`; `NaN` equals `NaN`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const eq: Comparison = binary("eq")

/**
 * `self !== that`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const neq: Comparison = binary("neq")

/**
 * `self < that`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const lt: Comparison = binary("lt")

/**
 * `self <= that`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const lte: Comparison = binary("lte")

/**
 * `self > that`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const gt: Comparison = binary("gt")

/**
 * `self >= that`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const gte: Comparison = binary("gte")

/**
 * `lower <= self && self <= upper`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const between: {
  <B, C>(lower: Input<B>, upper: Input<C>): <A extends Base<B> | null>(
    self: Expr<A>
  ) => Expr<boolean | Nullish<A> | Nullish<B> | Nullish<C>>
  <A, B extends Base<A> | null, C extends Base<A> | null>(
    self: Expr<A>,
    lower: Input<B>,
    upper: Input<C>
  ): Expr<boolean | Nullish<A> | Nullish<B> | Nullish<C>>
} = dual(3, (self: unknown, lower: unknown, upper: unknown) => internal.call("between", [self, lower, upper])) as any

/**
 * Whether the value is one of `values`.
 *
 * @stability experimental
 * @category comparisons
 * @since 4.1.5
 */
export const isIn: {
  <B>(values: ReadonlyArray<B>): <A extends Base<B> | null>(self: Expr<A>) => Expr<boolean | Nullish<A>>
  <A>(self: Expr<A>, values: ReadonlyArray<Base<A>>): Expr<boolean | Nullish<A>>
} = dual(2, (self: unknown, values: ReadonlyArray<unknown>) => internal.call("isIn", [self], { values })) as any

// -----------------------------------------------------------------------------
// Logic
// -----------------------------------------------------------------------------

/**
 * Three-valued AND: `false` if either side is `false`, otherwise `null` if
 * either side is `null`.
 *
 * @stability experimental
 * @category logic
 * @since 4.1.5
 */
export const and: {
  <B extends boolean | null>(
    that: Input<B>
  ): <A extends boolean | null>(self: Expr<A>) => Expr<boolean | Nullish<A> | Nullish<B>>
  <A extends boolean | null, B extends boolean | null>(
    self: Expr<A>,
    that: Input<B>
  ): Expr<boolean | Nullish<A> | Nullish<B>>
} = binary("and")

/**
 * Three-valued OR: `true` if either side is `true`, otherwise `null` if
 * either side is `null`.
 *
 * @stability experimental
 * @category logic
 * @since 4.1.5
 */
export const or: {
  <B extends boolean | null>(
    that: Input<B>
  ): <A extends boolean | null>(self: Expr<A>) => Expr<boolean | Nullish<A> | Nullish<B>>
  <A extends boolean | null, B extends boolean | null>(
    self: Expr<A>,
    that: Input<B>
  ): Expr<boolean | Nullish<A> | Nullish<B>>
} = binary("or")

/**
 * Negation; `null` stays `null`.
 *
 * @stability experimental
 * @category logic
 * @since 4.1.5
 */
export const not = <A extends boolean | null>(self: Expr<A>): Expr<A> => internal.call("not", [self])

// -----------------------------------------------------------------------------
// Missing values
// -----------------------------------------------------------------------------

/**
 * Whether the value is missing.
 *
 * @stability experimental
 * @category missing values
 * @since 4.1.5
 */
export const isNull = <A>(self: Expr<A>): Expr<boolean> => internal.call("isNull", [self])

/**
 * Whether the value is present.
 *
 * @stability experimental
 * @category missing values
 * @since 4.1.5
 */
export const isNotNull = <A>(self: Expr<A>): Expr<boolean> => internal.call("isNotNull", [self])

/**
 * Whether the value is `NaN` (`false` for integers; `null` stays `null`).
 *
 * @stability experimental
 * @category missing values
 * @since 4.1.5
 */
export const isNaN = <A extends Numeric | null>(self: Expr<A>): Expr<boolean | Nullish<A>> =>
  internal.call("isNaN", [self])

/**
 * Replaces missing values with `value`.
 *
 * @stability experimental
 * @category missing values
 * @since 4.1.5
 */
export const fillNull: {
  <B>(value: Input<B>): <A extends Base<B> | null>(self: Expr<A>) => Expr<NonNullable<A> | Base<B> | Nullish<B>>
  <A, B extends Base<A> | null>(self: Expr<A>, value: Input<B>): Expr<NonNullable<A> | Base<B> | Nullish<B>>
} = binary("fillNull")

type Coalesced<Es extends ReadonlyArray<unknown>> = Expr<Base<InputType<Es[number]>> | AllNullable<Es>>
type AllNullable<Es extends ReadonlyArray<unknown>> = Es extends readonly [infer H, ...infer T]
  ? null extends InputType<H> ? AllNullable<T> : never
  : null

/**
 * The first argument that is not `null`, per row.
 *
 * @stability experimental
 * @category missing values
 * @since 4.1.5
 */
export const coalesce = <const Es extends readonly [Input<any>, ...Array<Input<any>>]>(...exprs: Es): Coalesced<Es> =>
  internal.call("coalesce", exprs)

/**
 * `then` where `condition` is `true`, `otherwise` where it is `false` or
 * `null`.
 *
 * @stability experimental
 * @category conditionals
 * @since 4.1.5
 */
export const when = <T, O extends Base<T> | null>(
  condition: Expr<boolean | null>,
  then: Input<T>,
  otherwise: Input<O>
): Expr<Base<T> | Nullish<T> | Base<O> | Nullish<O>> => internal.call("when", [condition, then, otherwise])

// -----------------------------------------------------------------------------
// Casts
// -----------------------------------------------------------------------------

/**
 * Converts to another type. Values that don't fit (out of range, unparsable
 * strings, NaN to an integer) become `null`; floats truncate towards zero
 * when converted to integers.
 *
 * @stability experimental
 * @category conversions
 * @since 4.1.5
 */
export const cast: {
  <To extends keyof CastTargets>(to: To): <A>(self: Expr<A>) => Expr<CastTargets[To] | null>
  <A, To extends keyof CastTargets>(self: Expr<A>, to: To): Expr<CastTargets[To] | null>
} = dual(2, (self: unknown, to: string) => internal.call("cast", [self], { to })) as any

/**
 * Converts to a decimal with `precision` digits, `scale` of them after the
 * point. Values that don't fit become null; extra digits round half to even.
 *
 * @stability experimental
 * @category casts
 * @since 4.1.5
 */
export const castDecimal: {
  (precision: number, scale: number): <A>(self: Expr<A>) => Expr<BigDecimal.BigDecimal | null>
  <A>(self: Expr<A>, precision: number, scale: number): Expr<BigDecimal.BigDecimal | null>
} = dual(
  3,
  (self: unknown, precision: number, scale: number) =>
    internal.call("cast", [self], { to: "Decimal", precision, scale })
) as any

// -----------------------------------------------------------------------------
// Strings
// -----------------------------------------------------------------------------

/**
 * The number of Unicode code points.
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const length = <A extends string | null>(self: Expr<A>): Expr<number | Nullish<A>> =>
  internal.call("length", [self])

/**
 * Lower case.
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const toLowerCase = <A extends string | null>(self: Expr<A>): Expr<A> => internal.call("toLowerCase", [self])

/**
 * Upper case.
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const toUpperCase = <A extends string | null>(self: Expr<A>): Expr<A> => internal.call("toUpperCase", [self])

const pattern = (fn: "includes" | "startsWith" | "endsWith") =>
  dual(2, (self: unknown, text: string) => internal.call(fn, [self], { pattern: text })) as any

/**
 * Whether the string contains `text` (literally).
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const includes: {
  (text: string): <A extends string | null>(self: Expr<A>) => Expr<boolean | Nullish<A>>
  <A extends string | null>(self: Expr<A>, text: string): Expr<boolean | Nullish<A>>
} = pattern("includes")

/**
 * Whether the string starts with `text`.
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const startsWith: {
  (text: string): <A extends string | null>(self: Expr<A>) => Expr<boolean | Nullish<A>>
  <A extends string | null>(self: Expr<A>, text: string): Expr<boolean | Nullish<A>>
} = pattern("startsWith")

/**
 * Whether the string ends with `text`.
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const endsWith: {
  (text: string): <A extends string | null>(self: Expr<A>) => Expr<boolean | Nullish<A>>
  <A extends string | null>(self: Expr<A>, text: string): Expr<boolean | Nullish<A>>
} = pattern("endsWith")

/**
 * Concatenates the arguments as strings; `null` if any argument is `null`.
 *
 * @stability experimental
 * @category strings
 * @since 4.1.5
 */
export const concat = <const Es extends readonly [Input<any>, ...Array<Input<any>>]>(
  ...parts: Es
): Expr<string | { [K in keyof Es]: Nullish<InputType<Es[K]>> }[number]> => internal.call("concat", parts)

// -----------------------------------------------------------------------------
// Sorting
// -----------------------------------------------------------------------------

/**
 * Sorts by `self`, smallest first.
 *
 * @stability experimental
 * @category sorting
 * @since 4.1.5
 */
export const asc = <A>(self: Expr<A>): SortOrder<A> => ({ expr: self, descending: false })

/**
 * Sorts by `self`, largest first.
 *
 * @stability experimental
 * @category sorting
 * @since 4.1.5
 */
export const desc = <A>(self: Expr<A>): SortOrder<A> => ({ expr: self, descending: true })

// -----------------------------------------------------------------------------
// Aggregates
// -----------------------------------------------------------------------------

const agg = (fn: Plan.AggregateName, self?: unknown) =>
  internal.makeAggregate<any>({
    _tag: "AggregateCall",
    fn,
    arg: self === undefined ? undefined : internal.toNode(self)
  })

/**
 * The sum of the values; 0 for a group without values. Sums of 8- and 16-bit
 * integers are Int32.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const sum = <A extends Numeric | boolean | null>(
  self: Expr<A>
): Aggregate<NumericOf<A>> => agg("sum", self)

/**
 * The mean of the values; `null` for a group without values.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const mean = <A extends Numeric | null>(self: Expr<A>): Aggregate<number | null> => agg("mean", self)

/**
 * The median of the values (the mean of the middle two for an even count).
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const median = <A extends Numeric | null>(self: Expr<A>): Aggregate<number | null> => agg("median", self)

/**
 * The sample standard deviation (`n - 1` denominator); `null` for fewer than
 * two values.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const std = <A extends Numeric | null>(self: Expr<A>): Aggregate<number | null> => agg("std", self)

/**
 * The sample variance (`n - 1` denominator); `null` for fewer than two
 * values.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const variance = <A extends Numeric | null>(self: Expr<A>): Aggregate<number | null> => agg("variance", self)

/**
 * The smallest value. Float `NaN`s are skipped unless every value is `NaN`.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const min = <A>(self: Expr<A>): Aggregate<NonNullable<A> | null> => agg("min", self)

/**
 * The largest value. Float `NaN`s are skipped unless every value is `NaN`.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const max = <A>(self: Expr<A>): Aggregate<NonNullable<A> | null> => agg("max", self)

/**
 * Without an argument: the number of rows. With one: the number of rows
 * where the expression is not `null`.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const count = (self?: Expr<unknown>): Aggregate<number> => agg("count", self)

/**
 * The number of distinct values, `null` included.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const countDistinct = <A>(self: Expr<A>): Aggregate<number> => agg("countDistinct", self)

/**
 * The value in the group's first row (`null` if the group is empty).
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const first = <A>(self: Expr<A>): Aggregate<A | null> => agg("first", self)

/**
 * The value in the group's last row (`null` if the group is empty).
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const last = <A>(self: Expr<A>): Aggregate<A | null> => agg("last", self)

// -----------------------------------------------------------------------------
// Windows
// -----------------------------------------------------------------------------

/**
 * Evaluates `self` separately within each partition of rows with equal
 * `partitionBy` values. An aggregate gives its partition's value on every
 * row; a window function (`cumSum`, `shift`, `rank`, the rolling functions)
 * runs over its partition's rows in row order.
 *
 * **Example** (Share of each city's total)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const sales = DataFrame.fromColumns({ city: ["Vienna", "Berlin", "Vienna"], units: [2, 5, 6] })
 *
 * const rows = Query.from(sales).pipe(
 *   Query.withColumns((c) => ({
 *     share: Expr.divide(c.units, Expr.over(Expr.sum(c.units), [c.city])),
 *     running: Expr.over(Expr.cumSum(c.units), [c.city])
 *   })),
 *   Effect.map(DataFrame.toRows),
 *   Effect.runSync
 * )
 * rows[2] // => { city: "Vienna", units: 6, share: 0.75, running: 8 }
 * ```
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const over: {
  (partitionBy: ReadonlyArray<Expr<unknown>>): <A>(self: Expr<A> | Aggregate<A>) => Expr<A>
  <A>(self: Expr<A> | Aggregate<A>, partitionBy: ReadonlyArray<Expr<unknown>>): Expr<A>
} = dual(
  2,
  (self: unknown, partitionBy: ReadonlyArray<unknown>) =>
    internal.makeExpr({
      _tag: "Over",
      expression: internal.toNode(self),
      partitionBy: partitionBy.map(internal.toNode)
    })
) as any

type CumSum<A> = Expr<NumericOf<A> | Nullish<A>>

/**
 * The running sum: on each row, the sum of the values so far (in the
 * partition, with {@link over}). Nulls stay null and are skipped; NaN
 * propagates.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const cumSum = <A extends Numeric | boolean | null>(self: Expr<A>): CumSum<A> => internal.call("cumSum", [self])

/**
 * The running minimum. Nulls stay null; NaN is skipped.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const cumMin = <A>(self: Expr<A>): Expr<A> => internal.call("cumMin", [self])

/**
 * The running maximum. Nulls stay null; NaN is skipped.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const cumMax = <A>(self: Expr<A>): Expr<A> => internal.call("cumMax", [self])

/**
 * The number of non-null values so far.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const cumCount = (self: Expr<unknown>): Expr<number> => internal.call("cumCount", [self])

/**
 * The value `n` rows earlier (1 by default); a negative `n` looks ahead.
 * Null where there is no such row.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const shift: {
  (n?: number): <A>(self: Expr<A>) => Expr<A | null>
  <A>(self: Expr<A>, n?: number): Expr<A | null>
} = dual(
  (args) => isExpr(args[0]),
  (self: unknown, n = 1) => internal.call("shift", [self], { n })
) as any

/**
 * The difference to the value `n` rows earlier (1 by default).
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const diff: {
  (n?: number): <A extends Numeric | null>(self: Expr<A>) => Expr<A | null>
  <A extends Numeric | null>(self: Expr<A>, n?: number): Expr<A | null>
} = dual(
  (args) => isExpr(args[0]),
  (self: unknown, n = 1) => internal.call("diff", [self], { n })
) as any

/**
 * The rank of each value, 1 for the smallest (largest with `descending`).
 * Ties get the mean of their positions by default; `method` picks `min`,
 * `max`, `dense` (consecutive) or `ordinal` (by row order). Nulls get no
 * rank; NaN ranks above every number.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const rank: {
  (options?: {
    readonly method?: Plan.RankMethod | undefined
    readonly descending?: boolean | undefined
  }): <A>(self: Expr<A>) => Expr<number | Nullish<A>>
  <A>(self: Expr<A>, options?: {
    readonly method?: Plan.RankMethod | undefined
    readonly descending?: boolean | undefined
  }): Expr<number | Nullish<A>>
} = dual(
  (args) => isExpr(args[0]),
  (self: unknown, options?: { readonly method?: Plan.RankMethod; readonly descending?: boolean }) =>
    internal.call("rank", [self], {
      method: options?.method ?? "average",
      descending: options?.descending ?? false
    })
) as any

type Rolling = {
  (window: number, options?: { readonly minPeriods?: number | undefined }): <A extends Numeric | null>(
    self: Expr<A>
  ) => Expr<NonNullable<A> | null>
  <A extends Numeric | null>(
    self: Expr<A>,
    window: number,
    options?: { readonly minPeriods?: number | undefined }
  ): Expr<NonNullable<A> | null>
}

const rolling = (fn: "rollingSum" | "rollingMean" | "rollingMin" | "rollingMax"): Rolling =>
  dual(
    (args) => isExpr(args[0]),
    (self: unknown, window: number, options?: { readonly minPeriods?: number | undefined }) =>
      internal.call(fn, [self], { window, minPeriods: options?.minPeriods ?? window })
  ) as any

/**
 * The sum of the last `window` values (the current one included). Null
 * while fewer than `minPeriods` (default: `window`) of them are non-null.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const rollingSum: Rolling = rolling("rollingSum")

/**
 * The mean of the last `window` values; see {@link rollingSum}.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const rollingMean: {
  (window: number, options?: { readonly minPeriods?: number | undefined }): <A extends Numeric | null>(
    self: Expr<A>
  ) => Expr<number | null>
  <A extends Numeric | null>(
    self: Expr<A>,
    window: number,
    options?: { readonly minPeriods?: number | undefined }
  ): Expr<number | null>
} = rolling("rollingMean") as any

/**
 * The minimum of the last `window` values; see {@link rollingSum}.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const rollingMin: Rolling = rolling("rollingMin")

/**
 * The maximum of the last `window` values; see {@link rollingSum}.
 *
 * @stability experimental
 * @category windows
 * @since 4.1.5
 */
export const rollingMax: Rolling = rolling("rollingMax")

// -----------------------------------------------------------------------------
// Dates and times
// -----------------------------------------------------------------------------

type Field = <A extends DateTime.Utc | null>(self: Expr<A>) => Expr<number | Nullish<A>>
const datePart = (fn: Plan.FunctionName): Field => (self) => internal.call(fn, [self])

/**
 * The calendar year of a date or timestamp (UTC).
 *
 * **Example** (Calendar fields)
 *
 * ```ts import.meta.vitest
 * import { DateTime, Effect } from "effect"
 * import { DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const events = DataFrame.fromColumns({ at: [DateTime.makeUnsafe("2024-02-29T13:45:07Z")] })
 *
 * const rows = Query.from(events).pipe(
 *   Query.select((c) => ({ year: Expr.year(c.at), weekday: Expr.weekday(c.at), hour: Expr.hour(c.at) })),
 *   Effect.map(DataFrame.toRows),
 *   Effect.runSync
 * )
 * rows // => [{ year: 2024, weekday: 4, hour: 13 }]
 * ```
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const year: Field = datePart("year")

/**
 * The month (1–12) of a date or timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const month: Field = datePart("month")

/**
 * The day of the month (1–31) of a date or timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const day: Field = datePart("day")

/**
 * The hour (0–23) of a timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const hour: Field = datePart("hour")

/**
 * The minute (0–59) of a timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const minute: Field = datePart("minute")

/**
 * The second (0–59) of a timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const second: Field = datePart("second")

/**
 * The millisecond within the second (0–999) of a timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const millisecond: Field = datePart("millisecond")

/**
 * The ISO weekday of a date or timestamp: 1 for Monday to 7 for Sunday.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const weekday: Field = datePart("weekday")

/**
 * The day of the year (1–366) of a date or timestamp.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const ordinalDay: Field = datePart("ordinalDay")

/**
 * Rounds dates and timestamps down to a multiple of `every`: `"30s"`,
 * `"15m"`, `"1h"`, `"1d"` (from the epoch), `"1w"` (weeks start on Monday),
 * `"1mo"`, `"3mo"` or `"1y"` (calendar months and years).
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const truncate: {
  (every: string): <A extends DateTime.Utc | null>(self: Expr<A>) => Expr<A>
  <A extends DateTime.Utc | null>(self: Expr<A>, every: string): Expr<A>
} = dual(2, (self: unknown, every: string) => internal.call("truncate", [self], { every })) as any

type Total = <A extends Duration.Duration | null>(self: Expr<A>) => Expr<bigint | Nullish<A>>
const total = (fn: Plan.FunctionName): Total => (self) => internal.call(fn, [self])

/**
 * A duration in whole days, rounded toward zero.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const totalDays: Total = total("totalDays")

/**
 * A duration in whole hours, rounded toward zero.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const totalHours: Total = total("totalHours")

/**
 * A duration in whole minutes, rounded toward zero.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const totalMinutes: Total = total("totalMinutes")

/**
 * A duration in whole seconds, rounded toward zero.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const totalSeconds: Total = total("totalSeconds")

/**
 * A duration in whole milliseconds, rounded toward zero.
 *
 * @stability experimental
 * @category dates and times
 * @since 4.1.5
 */
export const totalMilliseconds: Total = total("totalMilliseconds")

// -----------------------------------------------------------------------------
// Lists and structs
// -----------------------------------------------------------------------------

type Element<A> = NonNullable<A> extends ReadonlyArray<infer E> ? E : never

/**
 * The number of elements of a list; null for a null list.
 *
 * **Example** (Working with list columns)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const Order = Schema.Struct({ id: Schema.String, items: Schema.Array(Schema.Number) })
 * const orders = DataFrame.fromRows(Order, [{ id: "a", items: [3, 5] }, { id: "b", items: [] }])
 *
 * const rows = Query.from(orders).pipe(
 *   Query.select((c) => ({ id: c.id, n: Expr.listLength(c.items), total: Expr.listSum(c.items) })),
 *   Effect.map(DataFrame.toRows),
 *   Effect.runSync
 * )
 * rows // => [{ id: "a", n: 2, total: 8 }, { id: "b", n: 0, total: 0 }]
 * ```
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listLength = <A extends ReadonlyArray<unknown> | null>(self: Expr<A>): Expr<number | Nullish<A>> =>
  internal.call("listLength", [self])

/**
 * The element at `index` (negative counts from the end); null when the
 * list is null or too short.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listGet: {
  (index: number): <A extends ReadonlyArray<unknown> | null>(self: Expr<A>) => Expr<Element<A> | null>
  <A extends ReadonlyArray<unknown> | null>(self: Expr<A>, index: number): Expr<Element<A> | null>
} = dual(2, (self: unknown, index: number) => internal.call("listGet", [self], { index })) as any

/**
 * The sum of each list's elements: 0 for an empty list, null for a null
 * list.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listSum = <A extends ReadonlyArray<Numeric | boolean | null> | null>(
  self: Expr<A>
): Expr<NumericOf<Element<A>> | Nullish<A>> => internal.call("listSum", [self])

/**
 * The mean of each list's elements; null for an empty or null list.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listMean = <A extends ReadonlyArray<Numeric | boolean | null> | null>(
  self: Expr<A>
): Expr<number | null> => internal.call("listMean", [self])

/**
 * The smallest element of each list; null for an empty or null list.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listMin = <A extends ReadonlyArray<unknown> | null>(self: Expr<A>): Expr<NonNullable<Element<A>> | null> =>
  internal.call("listMin", [self])

/**
 * The largest element of each list; null for an empty or null list.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listMax = <A extends ReadonlyArray<unknown> | null>(self: Expr<A>): Expr<NonNullable<Element<A>> | null> =>
  internal.call("listMax", [self])

/**
 * Whether each list holds `item`; null for a null list.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const listContains: {
  <B>(item: Input<B>): <A extends ReadonlyArray<unknown> | null>(self: Expr<A>) => Expr<boolean | Nullish<A>>
  <A extends ReadonlyArray<unknown> | null>(self: Expr<A>, item: Input<Base<Element<A>>>): Expr<boolean | Nullish<A>>
} = dual(2, (self: unknown, item: unknown) => internal.call("listContains", [self, item])) as any

/**
 * A field of a struct; null where the struct is null.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const field: {
  <A extends object | null, const K extends keyof NonNullable<A> & string>(
    name: K
  ): (self: Expr<A>) => Expr<NonNullable<A>[K] | Nullish<A>>
  <A extends object | null, const K extends keyof NonNullable<A> & string>(
    self: Expr<A>,
    name: K
  ): Expr<NonNullable<A>[K] | Nullish<A>>
} = dual(2, (self: unknown, name: string) => internal.call("field", [self], { name })) as any

/**
 * A struct of the given expressions; the record's keys name its fields.
 *
 * @stability experimental
 * @category lists and structs
 * @since 4.1.5
 */
export const struct = <const O extends { readonly [name: string]: Expr<any> }>(
  fields: O
): Expr<{ readonly [K in keyof O]: Type<O[K]> }> =>
  internal.call("struct", Object.values(fields), { names: Object.keys(fields) })

/**
 * Each group's values as a list, in row order.
 *
 * @stability experimental
 * @category aggregates
 * @since 4.1.5
 */
export const list = <A>(self: Expr<A>): Aggregate<ReadonlyArray<A>> => agg("list", self)
