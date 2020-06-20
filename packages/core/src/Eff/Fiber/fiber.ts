import * as O from "../../Option"
import { Sync, Async } from "../Effect/effect"
import { Exit } from "../Exit/exit"
import { FiberRef } from "../FiberRef/fiberRef"

import { FiberID } from "./id"

export interface CommonFiber<E, A> {
  wait: Async<Exit<E, A>>
  //children: Sync<Iterable<Runtime<any, any>>>
  getRef: <K>(fiberRef: FiberRef<K>) => Sync<K>
  inheritRefs: Async<void>
  interruptAs(fiberId: FiberID): Async<Exit<E, A>>
  poll: Async<O.Option<Exit<E, A>>>
}

export type Fiber<E, A> = Runtime<E, A> | Syntetic<E, A>

export interface Runtime<E, A> extends CommonFiber<E, A> {
  _tag: "RuntimeFiber"
}

export interface Syntetic<E, A> extends CommonFiber<E, A> {
  _tag: "SynteticFiber"
}
