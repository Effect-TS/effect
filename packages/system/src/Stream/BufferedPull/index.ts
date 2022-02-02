// ets_tracing: off

import "../../Operator/index.js"

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as R from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: T.Effect<R, O.Option<E>, A.Chunk<A>>,
    readonly done: R.Ref<boolean>,
    readonly cursor: R.Ref<Tp.Tuple<[A.Chunk<A>, number]>>
  ) {}
}

export function ifNotDone_<R, R1, E, E1, A, A1>(
  self: BufferedPull<R, E, A>,
  fa: T.Effect<R1, O.Option<E1>, A1>
): T.Effect<R1, O.Option<E1>, A1> {
  return T.chain_(self.done.get, (b) => (b ? T.fail(O.none) : fa))
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
      (a) => self.cursor.set(Tp.tuple(a, 0))
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
      R.modify(
        ({
          tuple: [c, i]
        }): Tp.Tuple<[T.Effect<R, O.Option<E>, A>, Tp.Tuple<[A.Chunk<A>, number]>]> => {
          if (i >= A.size(c)) {
            return Tp.tuple(
              T.chain_(update(self), () => pullElement(self)),
              Tp.tuple(A.empty(), 0)
            )
          } else {
            return Tp.tuple(T.succeed(A.unsafeGet_(c, i)), Tp.tuple(c, i + 1))
          }
        }
      ),
      T.flatten
    )
  )
}

export function pullChunk<R, E, A>(
  self: BufferedPull<R, E, A>
): T.Effect<R, O.Option<E>, A.Chunk<A>> {
  return ifNotDone_(
    self,
    pipe(
      self.cursor,
      R.modify(
        ({
          tuple: [chunk, idx]
        }): Tp.Tuple<
          [T.Effect<R, O.Option<E>, A.Chunk<A>>, Tp.Tuple<[A.Chunk<A>, number]>]
        > => {
          if (idx >= A.size(chunk)) {
            return Tp.tuple(
              T.chain_(update(self), () => pullChunk(self)),
              Tp.tuple(A.empty(), 0)
            )
          } else {
            return Tp.tuple(T.succeed(A.drop_(chunk, idx)), Tp.tuple(A.empty(), 0))
          }
        }
      ),
      T.flatten
    )
  )
}

export function make<R, E, A>(pull: T.Effect<R, O.Option<E>, A.Chunk<A>>) {
  return pipe(
    T.do,
    T.bind("done", () => R.makeRef(false)),
    T.bind("cursor", () => R.makeRef(Tp.tuple<[A.Chunk<A>, number]>(A.empty(), 0))),
    T.map(({ cursor, done }) => new BufferedPull(pull, done, cursor))
  )
}
