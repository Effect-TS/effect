import type { Both, Either, Left, Right } from "../StreamHaltStrategy.js"

export * from "../internal/Jumpers/StreamHaltStrategy.js"
export * from "../StreamHaltStrategy.js"

/**
 * @since 2.0.0
 * @category models
 */
export type HaltStrategy = Left | Right | Both | Either

export declare namespace HaltStrategy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../StreamHaltStrategy.js"
}

// TODO: align module names
export { HaltStrategy as StreamHaltStrategy }
