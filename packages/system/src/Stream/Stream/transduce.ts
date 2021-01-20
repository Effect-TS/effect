import { aggregate, aggregate_ } from "./aggregate"

/**
 * Applies the transducer to the stream and emits its outputs.
 */
export const transduce = aggregate

/**
 * Applies the transducer to the stream and emits its outputs.
 */
export const transduce_ = aggregate_
