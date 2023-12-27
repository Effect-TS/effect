/** @internal */
export class Stack<out A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}
}
