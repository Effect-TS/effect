/**
 * @since 1.0.0
 */
import { Schema } from "@effect/schema"
import type { ParseError } from "@effect/schema/ParseResult"
import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as Option from "effect/Option"

/**
 * Run an SQL query with a result schema.
 *
 * @since 1.0.0
 * @category constructor
 */
export const findAll: {
  <SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>
  ): <QE, QR>(
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>
  ) => Effect.Effect<ReadonlyArray<SA>, QE | ParseError, QR | SR>

  <QE, QR, SA, SI, SR>(
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>,
    schema: Schema.Schema<SA, SI, SR>
  ): Effect.Effect<ReadonlyArray<SA>, QE | ParseError, QR | SR>
} = dual(
  2,
  <QE, QR, SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>,
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>
  ): Effect.Effect<ReadonlyArray<SA>, QE | ParseError, QR | SR> =>
    Effect.flatMap(query, Schema.decodeUnknown(Schema.Array(schema)))
)

const void_ = <E, R>(
  query: Effect.Effect<ReadonlyArray<unknown>, E, R>
): Effect.Effect<void, E, R> => Effect.asVoid(query)

export {
  /**
   * Run an SQL query and discard the result.
   *
   * @since 1.0.0
   * @category constructor
   */
  void_ as void
}

/**
 * Run an SQL query with a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export const findOne: {
  <SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>
  ): <QE, QR>(
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>
  ) => Effect.Effect<Option.Option<SA>, QE | ParseError, QR | SR>

  <QE, QR, SA, SI, SR>(
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>,
    schema: Schema.Schema<SA, SI, SR>
  ): Effect.Effect<Option.Option<SA>, QE | ParseError, QR | SR>
} = dual(
  2,
  <QE, QR, SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>,
    query: Effect.Effect<ReadonlyArray<unknown>, QE | ParseError, QR>
  ): Effect.Effect<Option.Option<SA>, QE | ParseError, QR | SR> =>
    Effect.flatMap(query, (arr) =>
      Array.isArray(arr) && arr.length > 0
        ? Effect.asSome(Schema.decodeUnknown(schema)(arr[0]))
        : Effect.succeedNone)
)

/**
 * Run an SQL query with a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export const single: {
  <SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>
  ): <QE, QR>(
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>
  ) => Effect.Effect<
    SA,
    QE | ParseError | Cause.NoSuchElementException,
    QR | SR
  >

  <QE, QR, SA, SI, SR>(
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>,
    schema: Schema.Schema<SA, SI, SR>
  ): Effect.Effect<SA, QE | ParseError | Cause.NoSuchElementException, QR | SR>
} = dual(
  2,
  <QE, QR, SA, SI, SR>(
    schema: Schema.Schema<SA, SI, SR>,
    query: Effect.Effect<ReadonlyArray<unknown>, QE, QR>
  ): Effect.Effect<
    SA,
    QE | ParseError | Cause.NoSuchElementException,
    QR | SR
  > => Effect.flatten(findOne(query, schema))
)
