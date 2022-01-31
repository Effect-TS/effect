// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as P from "../../../../Promise/index.js"
import * as CH from "../../Channel/index.js"
import * as SK from "../../Sink/index.js"
import * as C from "../core.js"
import * as HO from "../Handoff.js"
import * as RunManaged from "./runManaged.js"

const SignalTypeId = Symbol()

const EmitTypeId = Symbol()
export class Emit<A> {
  readonly _signalTypeId: typeof SignalTypeId = SignalTypeId
  readonly _typeId: typeof EmitTypeId = EmitTypeId

  constructor(readonly els: CK.Chunk<A>) {}
}

const HaltTypeId = Symbol()
export class Halt<E> {
  readonly _signalTypeId: typeof SignalTypeId = SignalTypeId
  readonly _typeId: typeof HaltTypeId = HaltTypeId

  constructor(readonly cause: CS.Cause<E>) {}
}

const EndTypeId = Symbol()
export class End {
  readonly _signalTypeId: typeof SignalTypeId = SignalTypeId
  readonly _typeId: typeof EndTypeId = EndTypeId
}

type Signal<A, E> = Emit<A> | Halt<E> | End

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel_<R, R1, E extends E1, E1, A extends A1, A1, Z>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E1, A1, Z>
): M.Managed<R & R1, E | E1, Tp.Tuple<[Z, C.IO<E | E1, A1>]>> {
  return pipe(
    M.do,
    M.bind("p", () => T.toManaged(P.make<E | E1, Z>())),
    M.bind("handoff", () => T.toManaged(HO.make<Signal<A1, E | E1>>())),
    M.map(({ handoff, p }) => {
      const consumer = SK.foldSink_(
        SK.exposeLeftover(sink),
        (e) => SK.zipRight_(SK.fromEffect(P.fail_(p, e)), SK.fail(e)),
        ({ tuple: [z1, leftovers] }) => {
          const loop: CH.Channel<
            unknown,
            E,
            CK.Chunk<A1>,
            unknown,
            E | E1,
            CK.Chunk<A1>,
            void
          > = CH.readWithCause(
            (in_) =>
              CH.zipRight_(CH.fromEffect(HO.offer(handoff, new Emit(in_))), loop),
            (e) =>
              CH.zipRight_(
                CH.fromEffect(HO.offer(handoff, new Halt(e))),
                CH.failCause(e)
              ),
            (_) => CH.zipRight_(CH.fromEffect(HO.offer(handoff, new End())), CH.unit)
          )

          return new SK.Sink(
            CH.zipRight_(
              CH.zipRight_(
                CH.fromEffect(P.succeed_(p, z1)),
                CH.fromEffect(HO.offer(handoff, new Emit(leftovers)))
              ),
              loop
            )
          )
        }
      )

      const producer: CH.Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E | E1,
        CK.Chunk<A1>,
        void
      > = CH.unwrap(
        T.map_(HO.take(handoff), (sig) => {
          switch (sig._typeId) {
            case EmitTypeId:
              return CH.zipRight_(CH.write(sig.els), producer)
            case HaltTypeId:
              return CH.failCause(sig.cause)
            default:
              return CH.unit
          }
        })
      )

      return pipe(
        M.fork(RunManaged.runManaged_(self, consumer)),
        M.chain((_) => T.toManaged(P.await(p))),
        M.map((z) => Tp.tuple(z, new C.Stream(producer)))
      )
    }),
    M.flatten
  )
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 *
 * @ets_data_first peel_
 */
export function peel<R1, E extends E1, E1, A extends A1, A1, Z>(
  sink: SK.Sink<R1, E1, A1, E1, A1, Z>
) {
  return <R>(self: C.Stream<R, E, A>) => peel_(self, sink)
}
