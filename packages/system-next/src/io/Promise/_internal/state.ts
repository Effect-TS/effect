import type { IO } from "../../Effect"

export type State<E, A> = Pending<E, A> | Done<E, A>

export class Pending<E, A> {
  readonly _tag = "Pending"

  constructor(readonly joiners: Array<(_: IO<E, A>) => void>) {}
}

export class Done<E, A> {
  readonly _tag = "Done"

  constructor(readonly value: IO<E, A>) {}
}
