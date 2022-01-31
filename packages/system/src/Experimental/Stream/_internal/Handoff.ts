// ets_tracing: off

import type * as C from "../../../Cause/index.js"
import * as A from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import * as P from "../../../Promise/index.js"
import * as Ref from "../../../Ref/index.js"
import type * as SER from "./SinkEndReason.js"

export class Handoff<A> {
  constructor(readonly ref: Ref.Ref<State<A>>) {}
}

export function make<A>() {
  return pipe(
    P.make<never, void>(),
    T.chain((p) => Ref.makeRef<State<A>>(new Empty(p))),
    T.map((_) => new Handoff(_))
  )
}

export const StateTypeId = Symbol()

export const EmptyTypeId = Symbol()
export class Empty {
  readonly _stateTypeId: typeof StateTypeId = StateTypeId
  readonly _typeId: typeof EmptyTypeId = EmptyTypeId

  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

export const FullTypeId = Symbol()
export class Full<A> {
  readonly _stateTypeId: typeof StateTypeId = StateTypeId
  readonly _typeId: typeof FullTypeId = FullTypeId

  constructor(readonly a: A, readonly notifyConsumer: P.Promise<never, void>) {}
}

export type State<A> = Empty | Full<A>

export function offer<A>(handoff: Handoff<A>, a: A): T.UIO<void> {
  return T.chain_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return Tp.tuple(T.zipRight_(P.await(s.notifyConsumer), offer(handoff, a)), s)
        } else {
          return Tp.tuple(
            T.zipRight_(P.succeed_(s.notifyConsumer, undefined), P.await(p)),
            new Full(a, p)
          )
        }
      }),
      T.flatten
    )
  })
}

export function take<A>(handoff: Handoff<A>): T.UIO<A> {
  return T.chain_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return Tp.tuple(
            T.as_(P.succeed_(s.notifyConsumer, undefined), s.a),
            new Empty(p)
          )
        } else {
          return Tp.tuple(T.zipRight_(P.await(s.notifyConsumer), take(handoff)), s)
        }
      }),
      T.flatten
    )
  })
}

export function poll<A>(handoff: Handoff<A>): T.UIO<O.Option<A>> {
  return T.chain_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return Tp.tuple(
            T.as_(P.succeed_(s.notifyConsumer, undefined), O.some(s.a)),
            new Empty(p)
          )
        } else {
          return Tp.tuple(T.succeed(O.none), s)
        }
      }),
      T.flatten
    )
  })
}

export const HandoffSignalTypeId = Symbol()

export const EmitTypeId = Symbol()
export class Emit<A> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof EmitTypeId = EmitTypeId

  constructor(readonly els: A.Chunk<A>) {}
}

export const HaltTypeId = Symbol()
export class Halt<E> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof HaltTypeId = HaltTypeId

  constructor(readonly error: C.Cause<E>) {}
}

export const EndTypeId = Symbol()
export class End<C> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof EndTypeId = EndTypeId

  constructor(readonly reason: SER.SinkEndReason<C>) {}
}

export type HandoffSignal<C, E, A> = Emit<A> | Halt<E> | End<C>
