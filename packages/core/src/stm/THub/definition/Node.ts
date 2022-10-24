/**
 * @tsplus type effect/core/stm/THub/Node
 * @category model
 * @since 1.0.0
 */
export interface Node<A> {
  readonly head: A
  readonly subscribers: number
  readonly tail: TRef<Node<A>>
}

/**
 * @tsplus type effect/core/stm/THub/Node.Ops
 * @category model
 * @since 1.0.0
 */
export interface NodeOps {}
