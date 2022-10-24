import * as Option from "@fp-ts/data/Option"

/**
 * Creates a sink containing the last value.
 *
 * @tsplus static effect/core/stream/Sink.Ops last
 * @category constructors
 * @since 1.0.0
 */
export function last<In>(): Sink<never, never, In, In, Option.Option<In>> {
  return Sink.foldLeft(
    Option.none as Option.Option<In>,
    (_, input) => Option.some(input)
  )
}
