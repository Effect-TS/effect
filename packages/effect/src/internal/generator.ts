const closeSentinel = Symbol("~effect/internal/generator/CloseSentinel")

/** @internal */
export const closeOnShortCircuit = <ShortCircuit, Wrapped>(
  iterator: Generator<any, any, any>,
  shortCircuit: ShortCircuit,
  isShortCircuit: (yielded: any) => yielded is ShortCircuit,
  unwrap: (yielded: any) => unknown,
  wrap: (value: any) => Wrapped
): ShortCircuit | Wrapped => {
  const generator: Generator<any, any | typeof closeSentinel, unknown> = iterator
  let state = generator.return(closeSentinel)
  while (!state.done) {
    if (isShortCircuit(state.value)) {
      shortCircuit = state.value
      state = generator.return(closeSentinel)
    } else {
      state = generator.next(unwrap(state.value))
    }
  }
  return state.value === closeSentinel ? shortCircuit : wrap(state.value)
}
