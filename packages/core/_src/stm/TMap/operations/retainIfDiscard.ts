/**
 * Retains bindings matching predicate.
 *
 * @tsplus fluent ets/TMap retainIfDiscard
 */
export function retainIfDiscard_<K, V>(
  self: TMap<K, V>,
  f: (kv: Tuple<[K, V]>) => boolean
): USTM<void> {
  return self.removeIfDiscard((_) => !f(_))
}

/**
 * Retains bindings matching predicate.
 *
 * @tsplus static ets/TMap/Aspects retainIfDiscard
 */
export const retainIfDiscard = Pipeable(retainIfDiscard_)
