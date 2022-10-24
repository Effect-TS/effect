import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/io/Exit.Ops fromMaybe
 * @category conversions
 * @since 1.0.0
 */
export function fromMaybe<A>(option: Option<A>): Exit<void, A> {
  switch (option._tag) {
    case "None":
      return Exit.fail(undefined)
    case "Some":
      return Exit.succeed(option.value)
  }
}
