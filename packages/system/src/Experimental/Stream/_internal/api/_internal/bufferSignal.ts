// ets_tracing: off

import type * as CK from "../../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../../Effect/index.js"
import { pipe } from "../../../../../Function/index.js"
import * as M from "../../../../../Managed/index.js"
import * as P from "../../../../../Promise/index.js"
import * as Q from "../../../../../Queue/index.js"
import * as Ref from "../../../../../Ref/index.js"
import * as CH from "../../../Channel/index.js"
import * as TK from "../../../Take/index.js"

export function bufferSignal<R1, E1, A1>(
  managed: M.UIO<Q.Queue<Tp.Tuple<[TK.Take<E1, A1>, P.Promise<never, void>]>>>,
  channel: CH.Channel<R1, unknown, unknown, unknown, E1, CK.Chunk<A1>, any>
): CH.Channel<R1, unknown, unknown, unknown, E1, CK.Chunk<A1>, void> {
  const producer = (
    queue: Q.Queue<Tp.Tuple<[TK.Take<E1, A1>, P.Promise<never, void>]>>,
    ref: Ref.Ref<P.Promise<never, void>>
  ): CH.Channel<R1, E1, CK.Chunk<A1>, unknown, never, never, any> => {
    const terminate = (
      take: TK.Take<E1, A1>
    ): CH.Channel<R1, E1, CK.Chunk<A1>, unknown, never, never, any> =>
      CH.fromEffect(
        pipe(
          T.do,
          T.bind("latch", () => ref.get),
          T.tap(({ latch }) => P.await(latch)),
          T.bind("p", () => P.make<never, void>()),
          T.tap(({ p }) => Q.offer_(queue, Tp.tuple(take, p))),
          T.tap(({ p }) => ref.set(p)),
          T.tap(({ p }) => P.await(p)),
          T.asUnit
        )
      )

    return CH.readWith(
      (_in) =>
        CH.zipRight_(
          CH.fromEffect(
            pipe(
              T.do,
              T.bind("p", () => P.make<never, void>()),
              T.bind("added", ({ p }) => Q.offer_(queue, Tp.tuple(TK.chunk(_in), p))),
              T.tap(({ added, p }) => T.when_(ref.set(p), () => added)),
              T.asUnit
            )
          ),
          producer(queue, ref)
        ),
      (err) => terminate(TK.fail(err)),
      (_) => terminate(TK.end)
    )
  }

  const consumer = (
    queue: Q.Queue<Tp.Tuple<[TK.Take<E1, A1>, P.Promise<never, void>]>>
  ): CH.Channel<R1, unknown, unknown, unknown, E1, CK.Chunk<A1>, void> => {
    const process: CH.Channel<
      unknown,
      unknown,
      unknown,
      unknown,
      E1,
      CK.Chunk<A1>,
      void
    > = CH.chain_(CH.fromEffect(Q.take(queue)), ({ tuple: [take, promise] }) =>
      CH.zipRight_(
        CH.fromEffect(P.succeed_(promise, undefined)),
        TK.fold_(
          take,
          CH.end(undefined),
          (error) => CH.failCause(error),
          (value) => CH.zipRight_(CH.write(value), process)
        )
      )
    )

    return process
  }

  return CH.managed_(
    pipe(
      M.do,
      M.bind("queue", () => managed),
      M.bind("start", () => T.toManaged(P.make<never, void>())),
      M.tap(({ start }) => T.toManaged(P.succeed_(start, undefined))),
      M.bind("ref", ({ start }) => Ref.makeManagedRef(start)),
      M.tap(({ queue, ref }) =>
        M.fork(CH.runManaged(channel[">>>"](producer(queue, ref))))
      ),
      M.map(({ queue }) => queue)
    ),
    (queue) => consumer(queue)
  )
}
