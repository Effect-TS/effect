import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as Option from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const FiberRefsSym = Symbol.for("@effect/core/io/FiberRefs")

/**
 * @category symbol
 * @since 1.0.0
 */
export type FiberRefsSym = typeof FiberRefsSym

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @tsplus type effect/core/io/FiberRefs
 * @tsplus companion effect/core/io/FiberRefs.Ops
 * @category model
 * @since 1.0.0
 */
export class FiberRefs {
  readonly [FiberRefsSym]: FiberRefsSym = FiberRefsSym

  constructor(
    readonly locals: ReadonlyMap<
      FiberRef<any>,
      List.Cons<readonly [FiberId.Runtime, unknown]>
    >
  ) {}

  joinAs(fiberId: FiberId.Runtime, that: FiberRefs): FiberRefs {
    const parentFiberRefs = new Map(this.locals)

    that.locals.forEach((childStack, fiberRef) => {
      const ref = fiberRef
      const childValue = childStack.head[1]
      if (!Equal.equals(childStack.head[0], fiberId)) {
        if (!parentFiberRefs.has(ref)) {
          if (Equal.equals(childValue, ref.initial)) {
            return
          } else {
            parentFiberRefs.set(
              fiberRef,
              List.cons([fiberId, ref.join(ref.initial, childValue)] as const, List.nil())
            )
            return
          }
        }
        const parentStack = parentFiberRefs.get(ref)!
        const [ancestor, wasModified] = findAncestor(fiberRef, parentStack, childStack)
        if (wasModified) {
          const patch = ref.diff(ancestor, childValue)
          const oldValue = parentStack.head[1]
          const newValue = ref.join(oldValue, ref.patch(patch)(oldValue))
          if (!Equal.equals(oldValue, newValue)) {
            let newStack: List.Cons<readonly [FiberId.Runtime, unknown]>
            const [parentFiberId] = parentStack.head
            if (Equal.equals(parentFiberId, fiberId)) {
              newStack = List.cons([parentFiberId, newValue] as const, parentStack.tail)
            } else {
              newStack = List.cons([fiberId, newValue] as const, parentStack)
            }
            parentFiberRefs.set(ref, newStack)
          }
        }
      }
    })

    return new FiberRefs(parentFiberRefs)
  }

  /**
   * Forks this collection of fiber refs as the specified child fiber id. This
   * will potentially modify the value of the fiber refs, as determined by the
   * individual fiber refs that make up the collection.
   */
  forkAs(childId: FiberId.Runtime) {
    const map = new Map<FiberRef<any>, List.Cons<readonly [FiberId.Runtime, unknown]>>()
    this.locals.forEach((stack, fiberRef) => {
      const oldValue = stack.head[1]
      const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
      if (Equal.equals(oldValue, newValue)) {
        map.set(fiberRef, stack)
      } else {
        map.set(fiberRef, List.cons([childId, newValue] as const, stack))
      }
    })
    return new FiberRefs(map)
  }

  get fiberRefs() {
    return HashSet.from(this.locals.keys())
  }

  get<A>(fiberRef: FiberRef<A>): Option.Option<A> {
    return pipe(
      Option.fromNullable(this.locals.get(fiberRef)),
      Option.map((list) => list.head[1] as A)
    )
  }

  getOrDefault<A>(fiberRef: FiberRef<A>): A {
    return pipe(this.get(fiberRef), Option.getOrElse(fiberRef.initial))
  }

  get setAll() {
    return Effect.forEachDiscard(
      this.fiberRefs,
      (fiberRef) => fiberRef.set(this.getOrDefault(fiberRef))
    )
  }

  updateAs<A>(fiberId: FiberId.Runtime, fiberRef: FiberRef<A>, value: A) {
    const result = this.locals.get(fiberRef)
    let oldStack: List.List<readonly [FiberId.Runtime, unknown]>
    if (result == null) {
      oldStack = List.empty()
    } else {
      oldStack = result
    }
    const newStack = List.isNil(oldStack)
      ? List.cons([fiberId, value] as const, List.nil())
      : Equal.equals(oldStack.head[0], fiberId)
      ? List.cons([fiberId, value] as const, oldStack.tail)
      : List.cons([fiberId, value] as const, oldStack)
    return new FiberRefs((this.locals as Map<
      FiberRef<any>,
      List.Cons<readonly [FiberId.Runtime, unknown]>
    >).set(fiberRef, newStack))
  }

  delete<A>(fiberRef: FiberRef<A>) {
    ;(this.locals as Map<
      FiberRef<any>,
      List.Cons<readonly [FiberId.Runtime, unknown]>
    >).delete(fiberRef)
    return new FiberRefs(this.locals)
  }
}

/**
 * @tsplus type effect/core/io/FiberRefs.Aspects
 */
export interface FiberRefsAspects {}

/**
 * @tsplus static effect/core/io/FiberRefs.Ops $
 */
export const FiberRefsAspects: FiberRefsAspects = {}

/**
 * @tsplus tailRec
 */
function findAncestor(
  ref: FiberRef<any>,
  parentStack: List.List<readonly [FiberId.Runtime, unknown]>,
  childStack: List.List<readonly [FiberId.Runtime, unknown]>,
  childModified = false
): readonly [unknown, boolean] {
  if (List.isCons(parentStack) && List.isCons(childStack)) {
    const [parentFiberId] = parentStack.head
    const parentAncestors = parentStack.tail
    const [childFiberId, childRefValue] = childStack.head
    const childAncestors = childStack.tail
    if (parentFiberId.startTimeMillis < childFiberId.startTimeMillis) {
      return findAncestor(ref, parentStack, childAncestors, true)
    } else if (parentFiberId.startTimeMillis > childFiberId.startTimeMillis) {
      return findAncestor(ref, parentAncestors, childStack, childModified)
    } else {
      if (parentFiberId.id < childFiberId.id) {
        return findAncestor(ref, parentStack, childAncestors, true)
      } else if (parentFiberId.id > childFiberId.id) {
        return findAncestor(ref, parentAncestors, childStack, childModified)
      } else {
        return [childRefValue, childModified] as const
      }
    }
  }
  return [ref.initial, true] as const
}
