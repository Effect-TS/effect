import { Failure } from "@effect/core/io/Exit/definition";

/**
 * Maps over the cause type.
 *
 * @tsplus fluent ets/Exit mapErrorCause
 */
export function mapErrorCause_<E, A, E1>(
  self: Exit<E, A>,
  f: (cause: Cause<E>) => Cause<E1>
): Exit<E1, A> {
  switch (self._tag) {
    case "Failure":
      return new Failure(f(self.cause));
    case "Success":
      return self;
  }
}

/**
 * Maps over the cause type.
 *
 * @tsplus static ets/Exit/Aspects mapErrorCause
 */
export const mapErrorCause = Pipeable(mapErrorCause_);
