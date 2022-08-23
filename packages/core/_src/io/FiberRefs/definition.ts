export const FiberRefsSym = Symbol.for("@effect/core/io/FiberRefs")
export type FiberRefsSym = typeof FiberRefsSym

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 *
 * @tsplus type effect/core/io/FiberRefs
 * @tsplus companion effect/core/io/FiberRefs.Ops
 */
export class FiberRefs {
  readonly [FiberRefsSym]: FiberRefsSym = FiberRefsSym

  constructor(
    readonly locals: ImmutableMap<
      FiberRef<any>,
      List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>
    >
  ) {}

  joinAs(fiberId: FiberId.Runtime, that: FiberRefs): FiberRefs {
    const parentFiberRefs = new Map(this.locals.internalMap)

    that.locals.internalMap.forEach((childStack, fiberRef) => {
      const ref = fiberRef
      const childValue = childStack.head.get(1)
      if (!(childStack.head.get(0) == fiberId)) {
        if (!parentFiberRefs.has(ref)) {
          if (Equals.equals(childValue, ref.initial)) {
            return
          } else {
            parentFiberRefs.set(
              fiberRef,
              List.cons(Tuple(fiberId, ref.join(ref.initial, childValue)), List.nil())
            )
            return
          }
        }
        const parentStack = parentFiberRefs.get(ref)!
        const { tuple: [ancestor, wasModified] } = findAnchestor(
          fiberRef,
          parentStack,
          childStack
        )
        if (wasModified) {
          const patch = ref.diff(ancestor, childValue)
          const oldValue = parentStack.head.get(1)
          const newValue = ref.join(oldValue, ref.patch(patch)(oldValue))
          if (!Equals.equals(oldValue, newValue)) {
            let newStack: List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>
            const { tuple: [parentFiberId] } = parentStack.head
            if (parentFiberId == fiberId) {
              newStack = List.cons(Tuple(parentFiberId, newValue), parentStack.tail)
            } else {
              newStack = List.cons(Tuple(fiberId, newValue), parentStack)
            }
            parentFiberRefs.set(ref, newStack)
          }
        }
      }
    })

    return new FiberRefs(new ImmutableMap(parentFiberRefs))
  }

  /**
   * Forks this collection of fiber refs as the specified child fiber id. This
   * will potentially modify the value of the fiber refs, as determined by the
   * individual fiber refs that make up the collection.
   */
  forkAs(childId: FiberId.Runtime) {
    const map = new Map<FiberRef<any>, List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>>()
    this.locals.internalMap.forEach((stack, fiberRef) => {
      const oldValue = stack.head.get(1)
      const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
      if (Equals.equals(oldValue, newValue)) {
        map.set(fiberRef, stack)
      } else {
        map.set(fiberRef, List.cons(Tuple(childId, newValue), stack))
      }
    })
    return new FiberRefs(new ImmutableMap(map))
  }

  get fiberRefs() {
    return HashSet.from(this.locals.internalMap.keys())
  }

  get<A>(fiberRef: FiberRef<A>): Maybe<A> {
    return this.locals.get(fiberRef).map((list) => list.head.get(1) as A)
  }

  getOrDefault<A>(fiberRef: FiberRef<A>): A {
    return this.get(fiberRef).getOrElse(fiberRef.initial)
  }

  get setAll() {
    return Effect.forEachDiscard(
      this.fiberRefs,
      (fiberRef) => fiberRef.set(this.getOrDefault(fiberRef))
    )
  }

  updateAs<A>(fiberId: FiberId.Runtime, fiberRef: FiberRef<A>, value: A) {
    const oldStack = this.locals.get(fiberRef).getOrElse(
      List.empty<Tuple<[FiberId.Runtime, unknown]>>()
    )
    const newStack = oldStack.isNil()
      ? List.cons(Tuple(fiberId, value), List.nil())
      : oldStack.head.get(0).equals(fiberId)
      ? List.cons(Tuple(fiberId, value), oldStack.tail)
      : List.cons(Tuple(fiberId, value), oldStack)
    return new FiberRefs(this.locals.set(fiberRef, newStack))
  }

  delete<A>(fiberRef: FiberRef<A>) {
    return new FiberRefs(
      this.locals.remove(fiberRef)
    )
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
function findAnchestor(
  ref: FiberRef<any>,
  parentStack: List<Tuple<[FiberId.Runtime, unknown]>>,
  childStack: List<Tuple<[FiberId.Runtime, unknown]>>,
  childModified = false
): Tuple<[unknown, boolean]> {
  if (parentStack.isCons() && childStack.isCons()) {
    const { tuple: [parentFiberId] } = parentStack.head
    const parentAncestors = parentStack.tail
    const { tuple: [childFiberId, childRefValue] } = childStack.head
    const childAncestors = childStack.tail
    if (parentFiberId.startTimeMillis < childFiberId.startTimeMillis) {
      return findAnchestor(ref, parentStack, childAncestors, true)
    } else if (parentFiberId.startTimeMillis > childFiberId.startTimeMillis) {
      return findAnchestor(ref, parentAncestors, childStack, childModified)
    } else {
      if (parentFiberId.id < childFiberId.id) {
        return findAnchestor(ref, parentStack, childAncestors, true)
      } else if (parentFiberId.id > childFiberId.id) {
        return findAnchestor(ref, parentAncestors, childStack, childModified)
      } else {
        return Tuple(childRefValue, childModified)
      }
    }
  }
  return Tuple(ref.initial, true)
}
