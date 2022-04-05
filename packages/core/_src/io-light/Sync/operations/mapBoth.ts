import { concreteXPure } from "@effect-ts/core/io-light/Sync/definition";
/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @tsplus fluent ets/Sync mapBoth
 */
export function mapBoth_<R, E, A, E1, A1>(
  self: Sync<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => A1
): Sync<R, E1, A1> {
  concreteXPure(self);
  return self.mapBoth(f, g);
}

/**
 * Returns a computation whose error and success channels have been mapped
 * by the specified functions, `f` and `g`.
 *
 * @tsplus static ets/Sync/Aspects mapBoth
 */
export const mapBoth = Pipeable(mapBoth_);
