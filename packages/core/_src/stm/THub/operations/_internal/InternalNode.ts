import type { Node } from "@effect/core/stm/THub/definition/Node"

export class InternalNode<A> implements Node<A> {
  constructor(
    readonly head: A,
    readonly subscribers: number,
    readonly tail: TRef<Node<A>>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteNode<A>(
  _: Node<A>
): asserts _ is InternalNode<A> {
  //
}

/**
 * @tsplus static ets/THub/Node/Ops __call
 */
export function make<A>(head: A, subscribers: number, tail: TRef<Node<A>>): Node<A> {
  return new InternalNode(head, subscribers, tail)
}
