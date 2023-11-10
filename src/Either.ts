/**
 * @since 2.0.0
 */
import type { Left, Right } from "./impl/Either.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Either.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Either.js"

/**
 * @since 2.0.0
 */
export declare namespace Either {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Either.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export type Either<E, A> = Left<E, A> | Right<E, A>
