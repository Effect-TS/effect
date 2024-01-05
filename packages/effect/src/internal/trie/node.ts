/** @internal */
export class Node<out V> {
  constructor(
    public key: string, // TODO
    public value: V,
    public left: Node<V> | undefined,
    public mid: Node<V> | undefined,
    public right: Node<V> | undefined
  ) {}
}
