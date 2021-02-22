import * as T from "../Effect"
import * as A from "./core"

/**
 * Takes all elements so long as the effectual predicate returns true.
 */
export function takeLeftWhileM_<R, E, A>(
  self: A.Array<A>,
  p: (a: A) => T.Effect<R, E, boolean>
): T.Effect<R, E, A.Array<A>> {
  return T.suspend(() => {
    const result: A[] = []
    let taking: T.Effect<R, E, boolean> = T.succeed(true)

    self.forEach((a) => {
      taking = T.chain_(taking, (b) =>
        T.map_(
          T.if_(
            b,
            () => p(a),
            () => T.succeed(false)
          ),
          (r) => {
            if (r) {
              result.push(a)
            }

            return r
          }
        )
      )
    })

    return T.as_(taking, result as Array<A>)
  })
}

/**
 * Takes all elements so long as the effectual predicate returns true.
 */
export function takeLeftWhileM<R, E, A>(p: (a: A) => T.Effect<R, E, boolean>) {
  return (self: Array<A>) => takeLeftWhileM_(self, p)
}
