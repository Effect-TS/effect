/**
 * @since 2.0.0
 */
import type { Cause } from "./Cause.js"
import type { FiberId } from "./FiberId.js"
import type { FiberRefs } from "./FiberRefs.js"
import type { HashMap } from "./HashMap.js"
import type { LoggerTypeId } from "./impl/Logger.js"
import type { List } from "./List.js"
import type { LogLevel } from "./LogLevel.js"
import type { LogSpan } from "./LogSpan.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Logger.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Logger.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface Logger<Message, Output> extends Logger.Variance<Message, Output>, Pipeable {
  readonly log: (
    options: {
      readonly fiberId: FiberId
      readonly logLevel: LogLevel
      readonly message: Message
      readonly cause: Cause<unknown>
      readonly context: FiberRefs
      readonly spans: List<LogSpan>
      readonly annotations: HashMap<string, unknown>
      readonly date: Date
    }
  ) => Output
}

/**
 * @since 2.0.0
 */
export declare namespace Logger {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Message, Output> {
    readonly [LoggerTypeId]: {
      readonly _Message: (_: Message) => void
      readonly _Output: (_: never) => Output
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Options<Message> {
    readonly fiberId: FiberId
    readonly logLevel: LogLevel
    readonly message: Message
    readonly cause: Cause<unknown>
    readonly context: FiberRefs
    readonly spans: List<LogSpan>
    readonly annotations: HashMap<string, unknown>
    readonly date: Date
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Logger.js"
}
