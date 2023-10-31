/** @internal */
export const Color = {
  Red: 0 as Node.Color,
  Black: 1 << 0 as Node.Color
} as const

export declare namespace Node {
  export type Color = number & {
    readonly Color: unique symbol
  }
}

/** @internal */
export class Node<K, V> {
  constructor(
    public color: Node.Color,
    public key: K,
    public value: V,
    public left: Node<K, V> | undefined,
    public right: Node<K, V> | undefined,
    public count: number
  ) {}
}

/** @internal */
export function clone<K, V>(node: Node<K, V>) {
  return new Node(node.color, node.key, node.value, node.left, node.right, node.count)
}

/** @internal */
export function swap<K, V>(n: Node<K, V>, v: Node<K, V>) {
  n.key = v.key
  n.value = v.value
  n.left = v.left
  n.right = v.right
  n.color = v.color
  n.count = v.count
}

/** @internal */
export function repaint<K, V>(node: Node<K, V>, color: Node.Color) {
  return new Node(color, node.key, node.value, node.left, node.right, node.count)
}

/** @internal */
export function recount<K, V>(node: Node<K, V>) {
  node.count = 1 + (node.left?.count ?? 0) + (node.right?.count ?? 0)
}
