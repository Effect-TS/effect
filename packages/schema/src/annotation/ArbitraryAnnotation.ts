/**
 * @since 1.0.0
 */
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"

/**
 * @since 1.0.0
 */
export const ArbitraryAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/schema/annotation/ArbitraryAnnotation"
)

/**
 * @since 1.0.0
 */
export interface ArbitraryAnnotation<Config> {
  readonly _id: typeof ArbitraryAnnotationId
  readonly config: Config
  readonly handler: (config: Config, ...Arbitrarys: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
}

/**
 * @since 1.0.0
 */
export const isArbitraryAnnotation = (u: unknown): u is ArbitraryAnnotation<unknown> =>
  typeof u === "object" && u !== null && u["_id"] === ArbitraryAnnotationId

/**
 * @since 1.0.0
 */
export const arbitraryAnnotation = <Config>(
  config: Config,
  handler: (config: Config, ...Arbitrarys: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
): ArbitraryAnnotation<Config> => ({
  _id: ArbitraryAnnotationId,
  config,
  handler
})
