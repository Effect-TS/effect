import { Success } from "@effect-ts/core/io/Exit/definition";

/**
 * @tsplus static ets/Exit/Ops succeed
 */
export function succeed<A>(a: A): Exit<never, A> {
  return new Success(a);
}
