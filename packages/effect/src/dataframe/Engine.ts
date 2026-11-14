/**
 * What runs queries: the in-memory engine by default, or another engine
 * (for example `Sql.layer`, which runs plans on a database) provided as a
 * layer.
 *
 * **Mental model**
 *
 * - A query is a `Plan.Node`. Running it (`yield* query`, `Query.stream`,
 *   `Query.explain`) hands the plan to the {@link Engine} in the context.
 * - The {@link memory} engine runs plans in this process: it reads tables
 *   from the `Catalog`, rewrites the plan, and runs it.
 * - Other engines run the same plans elsewhere. Their results are frames
 *   like any other.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Stream from "../Stream.ts"
import { Catalog } from "./Catalog.ts"
import type { DataFrame, DataFrameError } from "./DataFrame.ts"
import * as Q from "./internal/query.ts"
import * as Streaming from "./internal/stream.ts"
import type * as Plan from "./Plan.ts"

/**
 * Types of the {@link Engine} service.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Engine {
  /**
   * An engine.
   *
   * @stability experimental
   * @category models
   * @since 4.1.5
   */
  export interface Service {
    /** A short name, for diagnostics. */
    readonly name: string
    /** The plan's result as one frame. */
    readonly collect: (plan: Plan.Node) => Effect.Effect<DataFrame<unknown>, DataFrameError>
    /** The plan's result as batches. */
    readonly stream: (plan: Plan.Node) => Stream.Stream<DataFrame<unknown>, DataFrameError>
    /** What running the plan does, as text. */
    readonly explain: (plan: Plan.Node) => Effect.Effect<string, DataFrameError>
  }
}

const frame = <A>(effect: Effect.Effect<A, DataFrameError>): Effect.Effect<DataFrame<unknown>, DataFrameError> =>
  effect as any

/**
 * The in-memory engine: tables from the `Catalog`, the plan rewritten
 * (predicate, slice and projection pushdown, top-k), streamed tables batch by
 * batch.
 *
 * @stability experimental
 * @category engines
 * @since 4.1.5
 */
export const memory: Engine.Service = {
  name: "memory",
  collect: (plan) => Catalog.use((catalog) => frame(Q.collect(plan, catalog))),
  stream: (plan) =>
    Stream.unwrap(
      Catalog.use((catalog) =>
        Effect.succeed(Streaming.stream(plan, catalog) as unknown as Stream.Stream<DataFrame<unknown>, DataFrameError>)
      )
    ),
  explain: (plan) => Catalog.use((catalog) => Q.explain(plan, catalog))
}

/**
 * Runs queries. Defaults to the {@link memory} engine.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export class Engine extends Context.Reference<Engine.Service>("effect/dataframe/Engine", {
  defaultValue: () => memory
}) {}

/**
 * A layer that runs queries with `engine`.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (engine: Engine.Service): Layer.Layer<never> => Layer.succeed(Engine, engine)
