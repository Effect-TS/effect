import * as Effect from "effect/Effect"
import * as List from "effect/List"
import * as Option from "effect/Option"

export const unfoldEffect = <A, S, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<Option.Option<readonly [A, S]>, E, R>
): Effect.Effect<ReadonlyArray<A>, E, R> =>
  Effect.map(
    unfoldEffectLoop(s, f, List.empty()),
    (list) => Array.from(List.reverse(list))
  )

const unfoldEffectLoop = <A, S, E, R>(
  s: S,
  f: (s: S) => Effect.Effect<Option.Option<readonly [A, S]>, E, R>,
  acc: List.List<A>
): Effect.Effect<List.List<A>, E, R> =>
  Effect.flatMap(f(s), (option) => {
    if (Option.isSome(option)) {
      return unfoldEffectLoop(option.value[1], f, List.prepend(acc, option.value[0]))
    } else {
      return Effect.succeed(acc)
    }
  })
