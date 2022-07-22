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

  joinAs(id: FiberId.Runtime, that: FiberRefs): FiberRefs {
    const parentFiberRefs = this.locals
    const childFiberRefs = that.locals

    const fiberRefLocals = Chunk.from(childFiberRefs).reduce(
      parentFiberRefs,
      (parentFiberRefs, { tuple: [fiberRef, childStack] }) => {
        const parentStack = parentFiberRefs.get(fiberRef).getOrElse(List.empty<Tuple<[FiberId.Runtime, unknown]>>())

        const values: List.NonEmpty<unknown> = combine(fiberRef, parentStack, childStack)

        const patches: List<unknown> = values.tail.reduce(
          Tuple(values.head, List.empty<unknown>()),
          ({ tuple: [oldValue, patches] }, newValue) =>
            Tuple(newValue, List.cons(fiberRef.diff(oldValue, newValue), patches))
        ).get(1).reverse

        if (patches.isNil()) {
          return parentFiberRefs
        }

        let newStack: List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>

        const patch = patches.tail.reduce(patches.head, (a, b) => fiberRef.combine(a, b))

        if (parentStack.isNil()) {
          newStack = List.cons(Tuple(id, fiberRef.patch(patch)(fiberRef.initial)), List.nil())
        } else {
          newStack = List.cons(Tuple(id, fiberRef.patch(patch)(parentStack.head.get(1))), parentStack.tail)
        }

        return parentFiberRefs.set(fiberRef, newStack)
      }
    )

    return new FiberRefs(fiberRefLocals)
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
    return Effect.forEachDiscard(this.fiberRefs, (fiberRef) => fiberRef.set(this.getOrDefault(fiberRef)))
  }

  updateAs<A>(fiberId: FiberId.Runtime, fiberRef: FiberRef<A>, value: A) {
    const oldStack = this.locals.get(fiberRef).getOrElse(List.empty<Tuple<[FiberId.Runtime, unknown]>>())
    const newStack = oldStack.isNil()
      ? List.cons(Tuple(fiberId, value), List.nil())
      : oldStack.head.get(0).equals(fiberId)
      ? List.cons(Tuple(fiberId, value), oldStack.tail)
      : List.cons(Tuple(fiberId, value), oldStack)
    return new FiberRefs(this.locals.set(fiberRef, newStack as List.NonEmpty<Tuple<[FiberId.Runtime, unknown]>>))
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

function combine<A>(
  fiberRef: FiberRef<A>,
  parentStack: List<Tuple<[FiberId.Runtime, A]>>,
  childStack: List.NonEmpty<Tuple<[FiberId.Runtime, A]>>
): List.NonEmpty<A> {
  return combineLoop(
    parentStack.reverse,
    childStack.reverse,
    fiberRef.initial,
    fiberRef.initial
  )
}

/**
 * @tsplus tailRec
 */
function combineLoop<A>(
  parentStack: List<Tuple<[FiberId.Runtime, A]>>,
  childStack: List<Tuple<[FiberId.Runtime, A]>>,
  lastParentValue: A,
  lastChildValue: A
): List.NonEmpty<A> {
  if (parentStack.isNil() || childStack.isNil()) {
    return List.cons(lastChildValue, childStack.map((tuple) => tuple.get(1)))
  }

  const { tuple: [parentId, parentValue] } = parentStack.head
  const parentTail = parentStack.tail

  const { tuple: [childId, childValue] } = childStack.head
  const childTail = childStack.tail

  if (parentId == childId) {
    return combineLoop(parentTail, childTail, parentValue, childValue)
  }

  if (parentId.id < childId.id) {
    return childStack.map((tuple) => tuple.get(1))
      .prepend(childValue)
      .prepend(lastChildValue)
      .prepend(lastParentValue)
  }

  return childStack.map((tuple) => tuple.get(1))
    .prepend(childValue)
    .prepend(lastChildValue)
}
