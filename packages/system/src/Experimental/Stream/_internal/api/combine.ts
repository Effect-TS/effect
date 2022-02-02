// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as Ex from "../../../../Exit/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as HO from "../Handoff.js"
import * as UnfoldEffect from "./unfoldEffect.js"

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 */
export function combine_<R, R1, E, E1, A, A1, A2, S>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    e1: T.Effect<R, O.Option<E>, A>,
    e2: T.Effect<R1, O.Option<E1>, A1>
  ) => T.Effect<R1, never, Ex.Exit<O.Option<E1>, Tp.Tuple<[A2, S]>>>
): C.Stream<R & R1, E1, A2> {
  const producer = <Err, Elem>(
    handoff: HO.Handoff<Ex.Exit<O.Option<Err>, Elem>>,
    latch: HO.Handoff<void>
  ): CH.Channel<R1, Err, Elem, unknown, never, never, any> =>
    CH.zipRight_(
      CH.fromEffect(HO.take(latch)),
      CH.readWithCause(
        (value: Elem) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, Ex.succeed(value))),
            producer(handoff, latch)
          ),
        (cause) =>
          CH.fromEffect(HO.offer(handoff, Ex.failCause(CS.map_(cause, O.some)))),
        (_) =>
          CH.zipRight_(
            CH.fromEffect(HO.offer(handoff, Ex.fail(O.none))),
            producer(handoff, latch)
          )
      )
    )

  return new C.Stream(
    CH.managed_(
      pipe(
        M.do,
        M.bind("left", () => T.toManaged(HO.make<Ex.Exit<O.Option<E>, A>>())),
        M.bind("right", () => T.toManaged(HO.make<Ex.Exit<O.Option<E1>, A1>>())),
        M.bind("latchL", () => T.toManaged(HO.make<void>())),
        M.bind("latchR", () => T.toManaged(HO.make<void>())),
        M.tap(({ latchL, left }) =>
          pipe(
            CH.concatMap_(self.channel, (_) => CH.writeChunk(_))[">>>"](
              producer(left, latchL)
            ),
            CH.runManaged,
            M.fork
          )
        ),
        M.tap(({ latchR, right }) =>
          pipe(
            CH.concatMap_(that.channel, (_) => CH.writeChunk(_))[">>>"](
              producer(right, latchR)
            ),
            CH.runManaged,
            M.fork
          )
        ),
        M.map(({ latchL, latchR, left, right }) =>
          Tp.tuple(left, right, latchL, latchR)
        )
      ),
      ({ tuple: [left, right, latchL, latchR] }) => {
        const pullLeft = T.zipRight_(
          HO.offer(latchL, undefined),
          T.chain_(HO.take(left), T.done)
        )
        const pullRight = T.zipRight_(
          HO.offer(latchR, undefined),
          T.chain_(HO.take(right), T.done)
        )

        return UnfoldEffect.unfoldEffect(s, (s) =>
          T.chain_(f(s, pullLeft, pullRight), (_) => T.unoption(T.done(_)))
        ).channel
      }
    )
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 *
 * @ets_data_first combine_
 */
export function combine<R, R1, E, E1, A, A1, A2, S>(
  that: C.Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    e1: T.Effect<R, O.Option<E>, A>,
    e2: T.Effect<R1, O.Option<E1>, A1>
  ) => T.Effect<R1, never, Ex.Exit<O.Option<E1>, Tp.Tuple<[A2, S]>>>
) {
  return (self: C.Stream<R, E, A>) => combine_(self, that, s, f)
}
