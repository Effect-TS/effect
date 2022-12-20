/**
 * @since 1.0.0
 */
import type { Pretty } from "@fp-ts/schema/Pretty"

/**
 * @since 1.0.0
 */
export const PrettyAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/schema/annotation/PrettyAnnotation"
)

/**
 * @since 1.0.0
 */
export interface PrettyAnnotation<Config> {
  readonly _id: typeof PrettyAnnotationId
  readonly config: Config
  readonly handler: (config: Config, ...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
}

/**
 * @since 1.0.0
 */
export const isPrettyAnnotation = (u: unknown): u is PrettyAnnotation<unknown> =>
  typeof u === "object" && u !== null && u["_id"] === PrettyAnnotationId

/**
 * @since 1.0.0
 */
export const prettyAnnotation = <Config>(
  config: Config,
  handler: (config: Config, ...Prettys: ReadonlyArray<Pretty<any>>) => Pretty<any>
): PrettyAnnotation<Config> => ({
  _id: PrettyAnnotationId,
  config,
  handler
})
