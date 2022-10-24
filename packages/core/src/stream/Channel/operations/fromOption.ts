import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Channel.Ops fromOption
 * @category conversions
 * @since 1.0.0
 */
export function fromOption<A>(
  option: Option.Option<A>
): Channel<never, unknown, unknown, unknown, Option.Option<never>, never, A> {
  return Channel.suspend(() => {
    switch (option._tag) {
      case "None": {
        return Channel.fail(Option.none)
      }
      case "Some": {
        return Channel.succeed(option.value)
      }
    }
  })
}
