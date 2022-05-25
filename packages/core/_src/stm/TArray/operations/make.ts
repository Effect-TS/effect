/**
 * Makes a new `TArray` that is initialized with specified values.
 *
 * @tsplus static ets/TArray/Ops __call
 */
export function make<ARGS extends any[]>(
  ...data: ARGS
): STM<unknown, never, TArray<ARGS[number]>> {
  return TArray.from(data)
}
