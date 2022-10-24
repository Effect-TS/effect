import { IWhileLoop } from "@effect/core/io/Effect/definition/primitives"

/**
 * A low-level while-loop with direct support in the Effect runtime. The only
 * reason to use this constructor is performance.
 *
 * See `Effect.iterate` for a user-friendly version of this operator that is
 * compatible with purely functional code.
 *
 * @tsplus static effect/core/io/Effect.Ops whileLoop
 * @category mutations
 * @since 1.0.0
 */
export function whileLoop<R, E, A>(
  check: LazyArg<boolean>,
  body: LazyArg<Effect<R, E, A>>,
  process: (a: A) => void
): Effect<R, E, A> {
  return new IWhileLoop(check, body, process)
}
