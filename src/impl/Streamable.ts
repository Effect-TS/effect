/**
 * @since 2.0.0
 */

import { pipeArguments } from "./Pipeable.js"
import * as Stream from "./Stream.js"

const streamVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/**
 * @since 2.0.0
 * @category constructors
 */
export abstract class Class<R, E, A> implements Stream.Stream<R, E, A> {
  /**
   * @since 2.0.0
   */
  readonly [Stream.StreamTypeId] = streamVariance

  /**
   * @since 2.0.0
   */
  pipe() {
    return pipeArguments(this, arguments)
  }

  /**
   * @since 2.0.0
   */
  abstract toStream(): Stream.Stream<R, E, A>

  /**
   * @internal
   */
  get channel() {
    return Stream.toChannel(this.toStream())
  }
}
