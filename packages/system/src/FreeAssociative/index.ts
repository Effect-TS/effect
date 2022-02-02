// ets_tracing: off

import "../Operator/index.js"

import { Stack } from "../Stack/index.js"
import * as St from "../Structural/index.js"

const _brand = Symbol()

export function isFreeAssociative(self: unknown): self is FreeAssociative<unknown> {
  return typeof self === "object" && self != null && _brand in self
}

export class IEmpty {
  readonly _tag = "Empty";
  readonly [_brand] = _brand

  get [St.hashSym](): number {
    return St.hash(toArray(this))
  }

  [St.equalsSym](that: unknown): boolean {
    return isFreeAssociative(that) && St.equals(toArray(this), toArray(that))
  }
}

export class IElement<A> {
  readonly _tag = "Element";
  readonly [_brand] = _brand
  constructor(readonly element: A) {}

  get [St.hashSym](): number {
    return St.hash(toArray(this))
  }

  [St.equalsSym](that: unknown): boolean {
    return isFreeAssociative(that) && St.equals(toArray(this), toArray(that))
  }
}

export class IConcat<A> {
  readonly _tag = "Concat";
  readonly [_brand] = _brand

  constructor(readonly left: FreeAssociative<A>, readonly right: FreeAssociative<A>) {}
}

export type FreeAssociative<A> = IEmpty | IElement<A> | IConcat<A>

export function init<A>(): FreeAssociative<A> {
  return new IEmpty()
}

export function of<A>(a: A): FreeAssociative<A> {
  return new IElement(a)
}

export function concat<A>(
  r: FreeAssociative<A>
): (l: FreeAssociative<A>) => FreeAssociative<A> {
  return (l) => new IConcat(l, r)
}

export function concat_<A>(
  l: FreeAssociative<A>,
  r: FreeAssociative<A>
): FreeAssociative<A> {
  return new IConcat(l, r)
}

export function append<A>(a: A): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new IConcat(_, new IElement(a))
}

export function append_<A>(_: FreeAssociative<A>, a: A): FreeAssociative<A> {
  return new IConcat(_, new IElement(a))
}

export function prepend<A>(a: A): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new IConcat(new IElement(a), _)
}

export function prepend_<A>(_: FreeAssociative<A>, a: A): FreeAssociative<A> {
  return new IConcat(new IElement(a), _)
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
