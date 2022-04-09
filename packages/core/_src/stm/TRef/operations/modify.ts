import { getOrMakeEntry } from "@effect/core/stm/TRef/operations/_internal/getOrMakeEntry";

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/TRef modify
 */
export function modify_<A, B>(self: TRef<A>, f: (a: A) => Tuple<[B, A]>): USTM<B> {
  return STM.Effect((journal) => {
    const entry = getOrMakeEntry(self, journal);
    const {
      tuple: [retValue, newValue]
    } = entry.use((_) => f(_.unsafeGet<A>()));
    entry.use((_) => _.unsafeSet(newValue));
    return retValue;
  });
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus static ets/TRef/Aspects modify
 */
export const modify = Pipeable(modify_);
