/** @internal */
export interface Node<V> {
  key: string
  count: number
  value: V | undefined
  left: Node<V> | undefined
  mid: Node<V> | undefined
  right: Node<V> | undefined
}

/** @internal */
export const makeNode = <V>(
  key: string,
  count: number,
  value: V | undefined = undefined,
  left: Node<V> | undefined = undefined,
  mid: Node<V> | undefined = undefined,
  right: Node<V> | undefined = undefined
): Node<V> => ({
  key,
  count,
  value,
  left,
  mid,
  right
})
