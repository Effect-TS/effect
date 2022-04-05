/**
 * Maps over the value type.
 *
 * @tsplus fluent ets/Exit map
 */
export function map_<E, A, B>(self: Exit<E, A>, f: (a: A) => B): Exit<E, B> {
  switch (self._tag) {
    case "Failure":
      return self;
    case "Success":
      return Exit.succeed(f(self.value));
  }
}

/**
 * Maps over the value type.
 *
 * @tsplus static ets/Exit/Aspects map
 */
export const map = Pipeable(map_);
