import * as A from "../../../Array"
import { pipe } from "../../../Function"
import * as O from "../../../Option"
import * as R from "../../Ref"
import * as Pull from "../Pull"
import * as T from "../_internal/effect"

export class BufferedPull<S, R, E, A> {
  constructor(
    readonly upstream: T.Effect<S, R, O.Option<E>, A.Array<A>>,
    readonly done: R.Ref<boolean>,
    readonly cursor: R.Ref<[A.Array<A>, number]>
  ) {}
}

export const ifNotDone = <S1, R1, E1, A1>(fa: T.Effect<S1, R1, O.Option<E1>, A1>) => <
  S,
  R,
  E,
  A
>(
  self: BufferedPull<S, R, E, A>
): T.Effect<S1, R1, O.Option<E1>, A1> =>
  pipe(
    self.done.get,
    T.chain((b) => (b ? Pull.end : fa))
  )

export const update = <S, R, E, A>(self: BufferedPull<S, R, E, A>) =>
  pipe(
    self,
    ifNotDone(
      pipe(
        self.upstream,
        T.foldM(
          O.fold(
            () =>
              pipe(
                self.done.set(true),
                T.chain(() => Pull.end)
              ),
            (e) => Pull.fail(e)
          ),
          (a) => self.cursor.set([a, 0])
        )
      )
    )
  )

export const pullElements = <S, R, E, A>(
  self: BufferedPull<S, R, E, A>
): T.Effect<S, R, O.Option<E>, A> =>
  pipe(
    self,
    ifNotDone(
      pipe(
        self.cursor,
        R.modify(([c, i]): [T.Effect<S, R, O.Option<E>, A>, [A.Array<A>, number]] => {
          if (i >= c.length) {
            return [
              pipe(
                update(self),
                T.chain(() => pullElements(self))
              ),
              [[], 0]
            ]
          } else {
            return [T.succeedNow(c[i]), [c, i + 1]]
          }
        }),
        T.flatten
      )
    )
  )

export const make = <S, R, E, A>(pull: T.Effect<S, R, O.Option<E>, A.Array<A>>) =>
  pipe(
    T.of,
    T.bind("done", () => R.makeRef(false)),
    T.bind("cursor", () => R.makeRef<[A.Array<A>, number]>([[], 0])),
    T.map(({ cursor, done }) => new BufferedPull(pull, done, cursor))
  )
