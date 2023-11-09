import type { Left, Right } from "./impl/Either.js"

export * from "./impl/Either.js"
export * from "./internal/Jumpers/Either.js"

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
