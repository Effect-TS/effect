/**
 * The tables a query can read by name.
 *
 * **Mental model**
 *
 * - `Query.table("trips", Trip)` (or a `Table` node in a plan) refers to a
 *   table by name. When the query runs, the {@link Catalog} in the context
 *   provides it.
 * - A table is a frame, an effect producing one (read a file, call a
 *   service, fetch over Arrow Flight), or a stream of frames (batches). Each
 *   run of a query reads each table it names once.
 * - A query over a streamed table runs batch by batch: row-wise operations
 *   per batch, grouping and aggregation folded into partial aggregates, so a
 *   stream larger than memory can be filtered and summarised.
 * - The default catalog is empty; provide one with {@link layer} or
 *   `Effect.provideService(Catalog, Catalog.make(...))`.
 *
 * **Example** (Providing tables)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Catalog, DataFrame, Expr, Query } from "effect/dataframe"
 *
 * const Trip = Schema.Struct({ city: Schema.String, km: Schema.Number })
 *
 * const longTrips = Query.table("trips", Trip).pipe(
 *   Query.filter((c) => Expr.gt(c.km, 10)),
 *   Query.pick("city")
 * )
 *
 * const trips = DataFrame.fromRows(Trip, [
 *   { city: "Vienna", km: 4 },
 *   { city: "Berlin", km: 31 }
 * ])
 *
 * const rows = longTrips.pipe(
 *   Effect.provide(Catalog.layer({ trips })),
 *   Effect.map(DataFrame.toRows),
 *   Effect.runSync
 * )
 * rows // => [{ city: "Berlin" }]
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Stream from "../Stream.ts"
import { type DataFrame, DataFrameError, isDataFrame } from "./DataFrame.ts"
import * as F from "./internal/frame.ts"

/**
 * Provides tables by name to running queries. Defaults to an empty catalog.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export class Catalog extends Context.Reference<Catalog.Service>("effect/dataframe/Catalog", {
  defaultValue: () => empty
}) {}

/**
 * Types of the {@link Catalog} service.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Catalog {
  /**
   * The shape of a catalog.
   *
   * @stability experimental
   * @category models
   * @since 4.1.5
   */
  export interface Service {
    /** The table called `name`, as one frame; fails when there is none. */
    readonly table: (name: string) => Effect.Effect<DataFrame<unknown>, DataFrameError>
    /** The table called `name`, as batches. */
    readonly stream: (name: string) => Stream.Stream<DataFrame<unknown>, DataFrameError>
    /** Whether the table called `name` is streamed (queries over it run batch by batch). */
    readonly streaming: (name: string) => boolean
  }
}

/**
 * A table: a frame, or an effect producing one.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Source =
  | DataFrame<any>
  | Effect.Effect<DataFrame<any>, DataFrameError>
  | Stream.Stream<DataFrame<any>, DataFrameError>

const unknownTable = (name: string) =>
  Effect.fail(new DataFrameError({ message: `unknown table ${JSON.stringify(name)}` }))

/**
 * A catalog without tables.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const empty: Catalog.Service = {
  table: unknownTable,
  stream: (name) => Stream.fromEffect(unknownTable(name)),
  streaming: () => false
}

const concatenated = (frames: ReadonlyArray<DataFrame<unknown>>): Effect.Effect<DataFrame<unknown>, DataFrameError> => {
  if (frames.length === 1) return Effect.succeed(frames[0])
  try {
    return Effect.succeed(F.concat(frames as unknown as ReadonlyArray<F.Frame>) as unknown as DataFrame<unknown>)
  } catch (cause) {
    return Effect.fail(new DataFrameError({ message: cause instanceof Error ? cause.message : String(cause), cause }))
  }
}

/**
 * A catalog of the given tables.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = (tables: { readonly [name: string]: Source }): Catalog.Service => {
  const entries = new Map(Object.entries(tables))
  return {
    table: (name) => {
      const source = entries.get(name)
      if (source === undefined) return unknownTable(name)
      if (isDataFrame(source)) return Effect.succeed(source)
      if (Stream.isStream(source)) {
        return Effect.flatMap(
          Stream.runCollect(source as Stream.Stream<DataFrame<unknown>, DataFrameError>),
          (frames) =>
            frames.length === 0
              ? Effect.fail(new DataFrameError({ message: `table ${JSON.stringify(name)} has no batches` }))
              : concatenated(frames)
        )
      }
      return source as Effect.Effect<DataFrame<unknown>, DataFrameError>
    },
    stream: (name) => {
      const source = entries.get(name)
      if (source === undefined) return Stream.fromEffect(unknownTable(name))
      if (isDataFrame(source)) return Stream.succeed(source)
      if (Stream.isStream(source)) return source as Stream.Stream<DataFrame<unknown>, DataFrameError>
      return Stream.fromEffect(source as Effect.Effect<DataFrame<unknown>, DataFrameError>)
    },
    streaming: (name) => Stream.isStream(entries.get(name))
  }
}

/**
 * A layer providing a catalog of the given tables.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (tables: { readonly [name: string]: Source }): Layer.Layer<never> =>
  Layer.succeed(Catalog, make(tables))
