/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus fluent ets/Ref/Synchronized modifySomeEffect
 */
export function modifySomeEffect_<R, E, A, B>(
  self: SynchronizedRef<A>,
  def: B,
  pf: (a: A) => Maybe<Effect<R, E, Tuple<[B, A]>>>,
  __tsplusTrace?: string
): Effect<R, E, B> {
  return self.modifyEffect((v) => pf(v).getOrElse(Effect.succeedNow(Tuple(def, v))))
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus static ets/Ref/Synchronized/Aspects modifySomeEffect
 */
export const modifySomeEffect = Pipeable(modifySomeEffect_)
