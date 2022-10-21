/**
 * @tsplus static effect/core/io/Exit.Ops fromMaybe
 */
export function fromMaybe<A>(option: Maybe<A>): Exit<void, A> {
  switch (option._tag) {
    case "None":
      return Exit.fail(undefined)
    case "Some":
      return Exit.succeed(option.value)
  }
}
