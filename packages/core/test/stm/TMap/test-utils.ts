/**
 * Makes a new assertion that requires a Collection to have the same elements
 * as the specified Collection with specified Equivalence, though not necessarily in the same order.
 */
export function hasSameElements<A>(
  self0: Collection<A>,
  eq: Equivalence<A>,
  that0: Collection<A>
): boolean {
  const self = Chunk.from(self0)
  const that = Chunk.from(that0)
  return self.size === that.size && self.forAll((_) => that.elem(eq, _)) &&
    that.forAll((_) => self.elem(eq, _))
}

export class HashContainer implements Equals {
  [Hash.sym](): number {
    return this.i
  }

  [Equals.sym](other: unknown): boolean {
    if (other instanceof HashContainer) {
      return this[Hash.sym]() === other[Hash.sym]()
    }

    return false
  }

  constructor(readonly i: number) {}

  toString(): string {
    return `HashContainer${this.i}`
  }
}
