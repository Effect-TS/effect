import type { Both, Either, Left, Right } from "./impl/StreamHaltStrategy.js"

export * from "./impl/StreamHaltStrategy.js"
export * from "./internal/Jumpers/StreamHaltStrategy.js"

/**
 * @since 2.0.0
 * @category models
 */
export type StreamHaltStrategy = Left | Right | Both | Either

export declare namespace StreamHaltStrategy {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/StreamHaltStrategy.js"
}
