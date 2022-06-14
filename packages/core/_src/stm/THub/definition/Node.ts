/**
 * @tsplus type ets/THub/Node
 */
export interface Node<A> {
  readonly head: A
  readonly subscribers: number
  readonly tail: TRef<Node<A>>
}
/**
 * @tsplus type ets/THub/Node/Ops
 */
export interface NodeOps {}
