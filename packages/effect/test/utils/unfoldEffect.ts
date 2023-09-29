import * as Effect from "effect/Effect"
import * as List from "effect/List"
import * as Option from "effect/Option"

export const unfoldEffect = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>
): Effect.Effect<R, E, ReadonlyArray<A>> =>
  Effect.map(
    unfoldEffectLoop(s, f, List.empty()),
    (list) => Array.from(List.reverse(list))
  )

const unfoldEffectLoop = <A, R, E, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>,
  acc: List.List<A>
): Effect.Effect<R, E, List.List<A>> =>
  Effect.flatMap(f(s), (option) => {
    if (Option.isSome(option)) {
      return unfoldEffectLoop(option.value[1], f, List.prepend(acc, option.value[0]))
    } else {
      return Effect.succeed(acc)
    }
  })
