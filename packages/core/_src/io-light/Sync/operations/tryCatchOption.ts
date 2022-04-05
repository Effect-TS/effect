/**
 * Get the `A` from an option.
 *
 * @tsplus static ets/Sync/Ops tryCatchOption
 */
export function tryCatchOption_<A, E>(option: Option<A>, onNone: LazyArg<E>) {
  return Sync.fromEither(Either.fromOption(option, onNone));
}

/**
 * Get the `A` from an option.
 *
 * @tsplus static ets/Sync/Aspects tryCatchOption
 */
export const tryCatchOption = Pipeable(tryCatchOption_);
