import type { Composite, None, Runtime } from "./impl/FiberId.js"

export * from "./impl/FiberId.js"
export * from "./internal/Jumpers/FiberId.js"

export declare namespace FiberId {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/FiberId.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type FiberId = None | Runtime | Composite
