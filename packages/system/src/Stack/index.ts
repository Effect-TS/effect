// ets_tracing: off

export class Stack<A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}
}
