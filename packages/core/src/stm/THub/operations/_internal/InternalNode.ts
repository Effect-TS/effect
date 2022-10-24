import type { Node } from "@effect/core/stm/THub/definition/Node"

/** @internal */
export class InternalNode<A> implements Node<A> {
  constructor(
    readonly head: A,
    readonly subscribers: number,
    readonly tail: TRef<Node<A>>
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteNode<A>(
  _: Node<A>
): asserts _ is InternalNode<A> {
  //
}

/**
 * @tsplus static effect/core/stm/THub/Node.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(head: A, subscribers: number, tail: TRef<Node<A>>): Node<A> {
  return new InternalNode(head, subscribers, tail)
}
