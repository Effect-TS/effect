/**
 * Makes a new `TArray` that is initialized with specified values.
 *
 * @tsplus static effect/core/stm/TArray.Ops __call
 */
export function make<ARGS extends any[]>(
  ...data: ARGS
): STM<never, never, TArray<ARGS[number]>> {
  return TArray.from(data)
}
