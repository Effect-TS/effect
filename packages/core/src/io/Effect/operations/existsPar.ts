const _found = Symbol("found")

/**
 * Determines whether any element of the `Collection<A>` satisfies the effectual
 * predicate `f`, working in parallel. Interrupts all effects on any failure or
 * finding an element that satisfies the predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops existsPar
 */
export function existsPar<R, E, A>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, boolean> {
  return Effect.forEachPar(as, (a) => Effect.ifEffect(f(a), Effect.fail(_found), Effect.unit))
    .foldEffect(
      (e) => e === _found ? Effect.succeed(true) : Effect.fail(e),
      () => Effect.succeed(false)
    )
}
