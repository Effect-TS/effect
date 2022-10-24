import * as Option from "@fp-ts/data/Option"

/**
 * Creates a sink containing the first value.
 *
 * @tsplus static effect/core/stream/Sink.Ops head
 * @category constructors
 * @since 1.0.0
 */
export function head<In>(): Sink<never, never, In, In, Option.Option<In>> {
  return Sink.fold(
    Option.none as Option.Option<In>,
    (option: Option.Option<In>) => Option.isNone(option),
    (option: Option.Option<In>, input) => Option.isSome(option) ? option : Option.some(input)
  )
}
