/**
 * @category constructors
 * @since 1.0.0
 */
export class Stack<A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}
}
