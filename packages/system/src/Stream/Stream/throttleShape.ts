import type * as A from "../../Chunk"
import * as T from "../_internal/effect"
import { throttleShapeM } from "./throttleShapeM"

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * function.
 */
export function throttleShape(units: number, duration: number, burst = 0) {
  return <O>(costFn: (c: A.Chunk<O>) => number) =>
    throttleShapeM(units, duration, burst)((os: A.Chunk<O>) => T.succeed(costFn(os)))
}
