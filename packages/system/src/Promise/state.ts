// ets_tracing: off

import type { IO } from "../Effect/effect.js"

export type State<E, A> = Done<E, A> | Pending<E, A>

export class Done<E, A> {
  readonly _tag = "Done"
  constructor(readonly value: IO<E, A>) {}
}

export class Pending<E, A> {
  readonly _tag = "Pending"
  constructor(readonly joiners: readonly ((_: IO<E, A>) => void)[]) {}
}
