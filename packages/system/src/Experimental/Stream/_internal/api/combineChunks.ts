// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import type * as Ex from "../../../../Exit/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import type * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as TK from "../../Take/index.js"
import * as C from "../core.js"
import * as HO from "../Handoff.js"
import * as UnfoldChunkEffect from "./unfoldChunkEffect.js"

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks_<R, R1, E, E1, A, A2, A3, S>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A2>,
  s: S,
  f: (
    s: S,
    e1: T.Effect<R, O.Option<E>, CK.Chunk<A>>,
    e2: T.Effect<R1, O.Option<E1>, CK.Chunk<A2>>
  ) => T.Effect<R & R1, never, Ex.Exit<O.Option<E | E1>, Tp.Tuple<[CK.Chunk<A3>, S]>>>
): C.Stream<R & R1, E | E1, A3> {
  const producer = <Err, Elem>(
    handoff: HO.Handoff<TK.Take<Err, Elem>>,
    latch: HO.Handoff<void>
  ): CH.Channel<R1, Err, CK.Chunk<Elem>, unknown, never, never, any> =>
    CH.zipRight_(
      CH.fromEffect(HO.take(latch)),
      CH.readWithCause(
        (chunk: CK.Chunk<Elem>) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, TK.chunk(chunk))),
            producer(handoff, latch)
          ),
        (cause) => CH.fromEffect(HO.offer(handoff, TK.failCause(cause))),
        (_) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, TK.end)),
            producer(handoff, latch)
          )
      )
    )

  return new C.Stream(
    CH.managed_(
      pipe(
        M.do,
        M.bind("left", () => T.toManaged(HO.make<TK.Take<E, A>>())),
        M.bind("right", () => T.toManaged(HO.make<TK.Take<E1, A2>>())),
        M.bind("latchL", () => T.toManaged(HO.make<void>())),
        M.bind("latchR", () => T.toManaged(HO.make<void>())),
        M.tap(({ latchL, left }) =>
          pipe(self.channel[">>>"](producer(left, latchL)), CH.runManaged, M.fork)
        ),
        M.tap(({ latchR, right }) =>
          pipe(that.channel[">>>"](producer(right, latchR)), CH.runManaged, M.fork)
        ),
        M.map(({ latchL, latchR, left, right }) =>
          Tp.tuple(left, right, latchL, latchR)
        )
      ),
      ({ tuple: [left, right, latchL, latchR] }) => {
        const pullLeft = T.zipRight_(
          HO.offer(latchL, undefined),
          T.chain_(HO.take(left), TK.done)
        )
        const pullRight = T.zipRight_(
          HO.offer(latchR, undefined),
          T.chain_(HO.take(right), TK.done)
        )

        return UnfoldChunkEffect.unfoldChunkEffect(s, (s) =>
          T.chain_(f(s, pullLeft, pullRight), (_) => T.unoption(T.done(_)))
        ).channel
      }
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * @ets_data_first combineChunks_
 */
export function combineChunks<R, R1, E, E1, A, A2, A3, S>(
  that: C.Stream<R1, E1, A2>,
  s: S,
  f: (
    s: S,
    e1: T.Effect<R, O.Option<E>, CK.Chunk<A>>,
    e2: T.Effect<R1, O.Option<E1>, CK.Chunk<A2>>
  ) => T.Effect<R & R1, never, Ex.Exit<O.Option<E | E1>, Tp.Tuple<[CK.Chunk<A3>, S]>>>
) {
  return (self: C.Stream<R, E, A>) => combineChunks_(self, that, s, f)
}
