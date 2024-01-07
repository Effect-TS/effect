/** @internal */
export class Node<out V> {
  constructor(
    public key: string,
    public count: number,
    public value: V | undefined = undefined,
    public left: Node<V> | undefined = undefined,
    public mid: Node<V> | undefined = undefined,
    public right: Node<V> | undefined = undefined
  ) {}
}
