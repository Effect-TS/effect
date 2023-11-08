import type { Both, Either, Left, Right } from "./StreamHaltStrategy.impl.js"

export * from "./internal/Jumpers/StreamHaltStrategy.js"
export * from "./StreamHaltStrategy.impl.js"

/**
 * @since 2.0.0
 * @category models
 */
export type HaltStrategy = Left | Right | Both | Either

export declare namespace HaltStrategy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./StreamHaltStrategy.impl.js"
}
