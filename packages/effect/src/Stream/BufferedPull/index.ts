import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as R from "../_internal/ref"
import * as Pull from "../Pull"

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: T.Effect<R, O.Option<E>, A.Array<A>>,
    readonly done: R.Ref<boolean>,
    readonly cursor: R.Ref<[A.Array<A>, number]>
  ) {}
}

export function ifNotDone_<R, R1, E, E1, A, A1>(
  self: BufferedPull<R, E, A>,
  fa: T.Effect<R1, O.Option<E1>, A1>
): T.Effect<R1, O.Option<E1>, A1> {
  return T.chain_(self.done.get, (b) => (b ? Pull.end : fa))
}

export function ifNotDone<R1, E1, A1>(fa: T.Effect<R1, O.Option<E1>, A1>) {
  return <R, E, A>(self: BufferedPull<R, E, A>) => ifNotDone_(self, fa)
}

export function update<R, E, A>(self: BufferedPull<R, E, A>) {
  return ifNotDone_(
    self,
    T.foldM_(
      self.upstream,
      O.fold(
        () => T.chain_(self.done.set(true), () => Pull.end),
        (e) => Pull.fail(e)
      ),
      (a) => self.cursor.set([a, 0])
    )
  )
}

export function pullElement<R, E, A>(
  self: BufferedPull<R, E, A>
): T.Effect<R, O.Option<E>, A> {
  return ifNotDone_(
    self,
    pipe(
      self.cursor,
      R.modify(([c, i]): [T.Effect<R, O.Option<E>, A>, [A.Array<A>, number]] => {
        if (i >= c.length) {
          return [T.chain_(update(self), () => pullElement(self)), [[], 0]]
        } else {
          return [T.succeed(c[i]), [c, i + 1]]
        }
      }),
      T.flatten
    )
  )
}

export function pullChunk<R, E, A>(
  self: BufferedPull<R, E, A>
): T.Effect<R, O.Option<E>, A.Array<A>> {
  return ifNotDone_(
    self,
    pipe(
      self.cursor,
      R.modify(([chunk, idx]): [
        T.Effect<R, O.Option<E>, A.Array<A>>,
        [A.Array<A>, number]
      ] => {
        if (idx >= chunk.length) {
          return [T.chain_(update(self), () => pullChunk(self)), [[], 0]]
        } else {
          return [T.succeed(A.dropLeft_(chunk, idx)), [[], 0]]
        }
      }),
      T.flatten
    )
  )
}

export function make<R, E, A>(pull: T.Effect<R, O.Option<E>, A.Array<A>>) {
  return pipe(
    T.do,
    T.bind("done", () => R.makeRef(false)),
    T.bind("cursor", () => R.makeRef<[A.Array<A>, number]>([[], 0])),
    T.map(({ cursor, done }) => new BufferedPull(pull, done, cursor))
  )
}
