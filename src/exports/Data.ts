import type { Equal } from "./Equal.js"

export * from "../Data.js"
export * from "../internal/Jumpers/Data.js"

export declare namespace Data {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Data.js"
}
/**
 * @category models
 * @since 2.0.0
 */
export type Data<A> =
  & { readonly [P in keyof A]: A[P] }
  & Equal
