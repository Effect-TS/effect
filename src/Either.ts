import type { Left, Right } from "./Either.impl.js"

export * from "./Either.impl.js"
export * from "./internal/Jumpers/Either.js"

export declare namespace Either {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Either.impl.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export type Either<E, A> = Left<E, A> | Right<E, A>
