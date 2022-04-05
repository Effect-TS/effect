import type { Success } from "@effect-ts/core/io/Exit/definition";

/**
 * Determines if the `Exit` result is a success.
 *
 * @tsplus fluent ets/Exit isSuccess
 */
export function isSuccess<E, A>(self: Exit<E, A>): self is Success<A> {
  return self._tag === "Success";
}
