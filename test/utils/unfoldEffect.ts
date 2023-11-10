import { Effect, List, Option } from "effect"

export const unfoldEffect = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option<readonly [A, S]>>
): Effect<R, E, ReadonlyArray<A>> =>
  Effect.map(
    unfoldEffectLoop(s, f, List.empty()),
    (list) => Array.from(List.reverse(list))
  )

const unfoldEffectLoop = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect<R, E, Option<readonly [A, S]>>,
  acc: List<A>
): Effect<R, E, List<A>> =>
  Effect.flatMap(f(s), (option) => {
    if (Option.isSome(option)) {
      return unfoldEffectLoop(option.value[1], f, List.prepend(acc, option.value[0]))
    } else {
      return Effect.succeed(acc)
    }
  })
