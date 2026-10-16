// Library transformations and checks that are deterministic and run no user
// code for primitive inputs. Compiled `decode` operations may run them on such
// inputs and still return `invalid`, because replaying them is unobservable.
const replaySafe = new WeakSet<object>()

/** @internal */
export const markReplaySafe = <A extends object>(value: A): A => {
  replaySafe.add(value)
  return value
}

/** @internal */
export const isReplaySafe = (value: object): boolean => replaySafe.has(value)
