/**
 * @tsplus type effect/core/stm/THub/Node
 */
export interface Node<A> {
  readonly head: A
  readonly subscribers: number
  readonly tail: TRef<Node<A>>
}
/**
 * @tsplus type effect/core/stm/THub/Node.Ops
 */
export interface NodeOps {}
