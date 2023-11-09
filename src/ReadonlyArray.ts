import type { NonEmptyArray, NonEmptyReadonlyArray } from "./impl/ReadonlyArray.js"

export * from "./impl/ReadonlyArray.js"
export * from "./internal/Jumpers/ReadonlyArray.js"

export type ReadonlyArray<T> = globalThis.ReadonlyArray<T>

/**
 * @since 2.0.0
 */
export declare namespace ReadonlyArray {
  /**
   * @since 2.0.0
   */
  export type Infer<T extends ReadonlyArray<any>> = T[number]

  /**
   * @since 2.0.0
   */
  export type With<T extends ReadonlyArray<any>, A> = T extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A>
    : Array<A>

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ReadonlyArray.js"
}
