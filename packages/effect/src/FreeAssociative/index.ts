import { Stack } from "../Stack"

export class Empty {
  readonly _tag = "Empty"
}

export class Element<A> {
  readonly _tag = "Element"
  constructor(readonly element: A) {}
}

export class Concat<A> {
  readonly _tag = "Concat"
  constructor(readonly left: FreeAssociative<A>, readonly right: FreeAssociative<A>) {}
}

export type FreeAssociative<A> = Empty | Element<A> | Concat<A>

export function init<A>(): FreeAssociative<A> {
  return new Empty()
}

export function append<A>(a: A): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new Concat(_, new Element(a))
}

export function prepend<A>(a: A): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new Concat(new Element(a), _)
}

export function toArray<A>(_: FreeAssociative<A>): readonly A[] {
  const as = <A[]>[]
  let current: FreeAssociative<A> | undefined = _
  let stack: Stack<FreeAssociative<A>> | undefined = undefined
  while (typeof current !== "undefined") {
    switch (current._tag) {
      case "Empty": {
        current = undefined
        break
      }
      case "Element": {
        as.push(current.element)
        current = undefined
        break
      }
      case "Concat": {
        const p: any = stack
        stack = new Stack(current.right, p)
        current = current.left
        break
      }
    }
    if (typeof current === "undefined") {
      if (typeof stack !== "undefined") {
        current = stack.value
        stack = stack.previous
      }
    }
  }
  return as
}
