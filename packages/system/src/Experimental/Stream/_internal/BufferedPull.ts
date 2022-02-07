// ets_tracing: off

import * as A from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import * as Ref from "../../../Ref/index.js"
import * as Pull from "../Pull/index.js"

export class BufferedPull<R, E, A> {
  constructor(
    readonly upstream: T.Effect<R, O.Option<E>, A.Chunk<A>>,
    readonly done: Ref.Ref<boolean>,
    readonly cursor: Ref.Ref<Tp.Tuple<[A.Chunk<A>, number]>>
  ) {}
}

export function make<R, E, A>(upstream: T.Effect<R, O.Option<E>, A.Chunk<A>>) {
  return pipe(
    T.do,
    T.bind("done", () => Ref.makeRef(false)),
    T.bind("cursor", () => Ref.makeRef(Tp.tuple(A.empty<A>(), 0))),
    T.map(({ cursor, done }) => new BufferedPull<R, E, A>(upstream, done, cursor))
  )
}

export function ifNotDone_<R, R1, E, E1, A, A1>(
  self: BufferedPull<R, E, A>,
  fa: T.Effect<R1, O.Option<E1>, A1>
): T.Effect<R1, O.Option<E1>, A1> {
  return T.chain_(Ref.get(self.done), (_) => {
    if (_) {
      return Pull.end
    } else {
      return fa
    }
  })
}

/**
 * @ets_data_first ifNotDone_
 */
export function ifNotDone<R1, E1, A1>(fa: T.Effect<R1, O.Option<E1>, A1>) {
  return <R, E, A>(self: BufferedPull<R, E, A>) => ifNotDone_(self, fa)
}

export function update<R, E, A>(
  self: BufferedPull<R, E, A>
): T.Effect<R, O.Option<E>, void> {
  return ifNotDone_(
    self,
    T.foldM_(
      self.upstream,
      O.fold(
        () => T.zipRight_(Ref.set_(self.done, true), Pull.end),
        (e) => Pull.fail(e)
      ),
      (chunk) => Ref.set_(self.cursor, Tp.tuple(chunk, 0))
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
      Ref.modify(({ tuple: [chunk, idx] }) => {
        if (idx >= A.size(chunk)) {
          return Tp.tuple(
            T.zipRight_(update(self), pullElement(self)),
            Tp.tuple(A.empty<A>(), 0)
          )
        } else {
          return Tp.tuple(
            T.succeed(A.unsafeGet_(chunk, idx)),
            Tp.tuple(A.empty<A>(), idx + 1)
          )
        }
      }),
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
      Ref.modify(({ tuple: [chunk, idx] }) => {
        if (idx >= A.size(chunk)) {
          return Tp.tuple(
            T.zipRight_(update(self), pullChunk(self)),
            Tp.tuple(A.empty<A>(), 0)
          )
        } else {
          return Tp.tuple(T.succeed(A.drop_(chunk, idx)), Tp.tuple(A.empty<A>(), 0))
        }
      }),
      T.flatten
    )
  )
}
