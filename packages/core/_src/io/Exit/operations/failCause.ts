import { Failure } from "@effect-ts/core/io/Exit/definition";

/**
 * @tsplus static ets/Exit/Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Exit<E, never> {
  return new Failure(cause);
}
