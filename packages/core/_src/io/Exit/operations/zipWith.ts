/**
 * Zips this together with the specified result using the combination
 * functions.
 *
 * @tsplus fluent ets/Exit zipWith
 */
export function zipWith_<E, E1, A, B, C>(
  self: Exit<E, A>,
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: Cause<E>, e1: Cause<E1>) => Cause<E | E1>
): Exit<E | E1, C> {
  switch (self._tag) {
    case "Failure": {
      switch (that._tag) {
        case "Success": {
          return self;
        }
        case "Failure": {
          return Exit.failCause(g(self.cause, that.cause));
        }
      }
    }
    case "Success": {
      switch (that._tag) {
        case "Success": {
          return Exit.succeed(f(self.value, that.value));
        }
        case "Failure": {
          return that;
        }
      }
    }
  }
}

/**
 * Zips this together with the specified result using the combination
 * functions.
 *
 * @tsplus static ets/Exit/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_);
