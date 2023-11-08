import type { Composite, None, Runtime } from "./FiberId.impl.js"

export * from "./FiberId.impl.js"
export * from "./internal/Jumpers/FiberId.js"

export declare namespace FiberId {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./FiberId.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type FiberId = None | Runtime | Composite
