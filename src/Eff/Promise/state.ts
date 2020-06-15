import { AsyncE } from "../Effect/effect"

export type State<E, A> = Done<E, A> | Pending<E, A>

export class Done<E, A> {
  readonly _tag = "Done"
  constructor(readonly value: AsyncE<E, A>) {}
}

export class Pending<E, A> {
  readonly _tag = "Pending"
  constructor(readonly joiners: readonly ((_: AsyncE<E, A>) => void)[]) {}
}
