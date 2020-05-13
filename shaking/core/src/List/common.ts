export type List<A> = Cons<A> | Nil

export interface Cons<A> {
  readonly _tag: "cons"
  readonly head: A
  readonly tail: List<A>
}

export interface Nil {
  readonly _tag: "nil"
}
