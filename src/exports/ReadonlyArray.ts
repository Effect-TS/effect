import type { NonEmptyArray, NonEmptyReadonlyArray } from "../ReadonlyArray.js"

export * from "../internal/Jumpers/ReadonlyArray.js"
export * from "../ReadonlyArray.js"

export interface ReadonlyArray<T> extends globalThis.ReadonlyArray<T> {}
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
  export type * from "../ReadonlyArray.js"
}
