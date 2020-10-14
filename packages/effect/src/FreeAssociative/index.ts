import type { Endomorphism, Predicate, Refinement } from "../Function"
import { flow } from "../Function"
import type { Option } from "../Option"
import { isSome } from "../Option"
import { Stack } from "../Stack"

export class IEmpty {
  readonly _tag = "Empty"
}

export class IElement<A> {
  readonly _tag = "Element"
  constructor(readonly element: A) {}
}

export class IConcat<A> {
  readonly _tag = "Concat"
  constructor(readonly left: FreeAssociative<A>, readonly right: FreeAssociative<A>) {}
}

export class IFilter<A> {
  readonly _tag = "Filter"
  constructor(readonly self: FreeAssociative<A>, readonly f: Predicate<A>) {}
}

export class IMap<A> {
  readonly _tag = "Map"
  constructor(readonly self: FreeAssociative<A>, readonly f: Endomorphism<A>) {}
}

export type FreeAssociative<A> =
  | IEmpty
  | IElement<A>
  | IConcat<A>
  | IFilter<A>
  | IMap<A>

export function init<A>(): FreeAssociative<A> {
  return new IEmpty()
}

export function of<A>(a: A): FreeAssociative<A> {
  return new IElement(a)
}

export function filter<A, B extends A>(
  f: Refinement<A, B>
): (_: FreeAssociative<A>) => FreeAssociative<B>
export function filter<A>(
  f: Predicate<A>
): (_: FreeAssociative<A>) => FreeAssociative<A>
export function filter<A>(
  f: Predicate<A>
): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new IFilter(_, f)
}

export function map<A, B>(
  f: (a: A) => B
): (_: FreeAssociative<A>) => FreeAssociative<B> {
  return (_) => new IMap(_, f as any) as any
}

export function concat<A>(
  r: FreeAssociative<A>
): (l: FreeAssociative<A>) => FreeAssociative<A> {
  return (l) => new IConcat(l, r)
}

export function append<A>(a: A): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new IConcat(_, new IElement(a))
}

export function prepend<A>(a: A): (_: FreeAssociative<A>) => FreeAssociative<A> {
  return (_) => new IConcat(new IElement(a), _)
}

export function filterMap<A, B>(
  f: (a: A) => Option<B>
): (fa: FreeAssociative<A>) => FreeAssociative<B> {
  return flow(
    map(f),
    filter(isSome),
    map((x) => x.value)
  )
}

export type Ops<A> = IFilter<A> | IMap<A>

export function toArray<A>(_: FreeAssociative<A>): readonly A[] {
  const as = <A[]>[]
  let current: FreeAssociative<A> | undefined = _
  let stack: Stack<FreeAssociative<A>> | undefined = undefined
  let ops: Stack<Ops<A>> | undefined = undefined

  while (typeof current !== "undefined") {
    switch (current._tag) {
      case "Empty": {
        current = undefined
        break
      }
      case "Element": {
        if (typeof ops !== "undefined") {
          let currentOp: Stack<Ops<A>> | undefined = ops
          let drop = false
          let cv = current.element
          while (typeof currentOp !== "undefined" && !drop) {
            switch (currentOp.value._tag) {
              case "Filter": {
                if (!currentOp.value.f(cv)) {
                  drop = true
                }
                break
              }
              case "Map": {
                cv = currentOp.value.f(cv)
                break
              }
            }
            currentOp = currentOp.previous
          }
          if (!drop) {
            as.push(cv)
          }
        } else {
          as.push(current.element)
        }
        current = undefined
        break
      }
      case "Filter": {
        ops = new Stack(current, ops)
        current = current.self
        break
      }
      case "Map": {
        ops = new Stack(current, ops)
        current = current.self
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
