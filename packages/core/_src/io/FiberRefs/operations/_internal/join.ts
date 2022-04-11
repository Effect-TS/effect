import { concreteFiberRefs, FiberRefsInternal } from "@effect/core/io/FiberRefs/operations/_internal/FiberRefsInternal";

export function joinFiberRefs(self: FiberRefs, that: FiberRefs): FiberRefs {
  concreteFiberRefs(self);
  concreteFiberRefs(that);

  const parentFiberRefs = self.fiberRefLocals;
  const childFiberRefs = that.fiberRefLocals;

  const fiberRefLocals = childFiberRefs.reduceWithIndex(parentFiberRefs, (parentFiberRefs, fiberRef, childStack) => {
    const parentStack = parentFiberRefs.get(fiberRef).getOrElse(List.empty<Tuple<[FiberId.Runtime, unknown]>>());

    const values = combine(fiberRef, parentStack, childStack);

    const patches = values.tail.reduce(
      Tuple(values.head, List.empty<unknown>()),
      ({ tuple: [oldValue, patches] }, newValue) => Tuple(newValue, patches.prepend(fiberRef.diff(oldValue, newValue)))
    ).get(1).reverse();

    if (patches.isNil()) {
      return parentFiberRefs;
    }

    const firstPatch = patches.head;
    const restPatches = patches.tail;
    const patch = restPatches.reduce(firstPatch, (a, b) => fiberRef.combine(a, b));

    const newStack = (function() {
      if (parentStack.isNil()) {
        return Option.none;
      }
      const { tuple: [fiberId, oldValue] } = parentStack.head;
      const tail = parentStack.tail;
      return Option.some(tail.prepend(Tuple(fiberId, fiberRef.patch(patch)(oldValue))));
    })();

    return newStack.fold(
      parentFiberRefs,
      (stack) => parentFiberRefs.set(fiberRef, stack)
    );
  });

  return new FiberRefsInternal(fiberRefLocals);
}

function combine<A>(
  fiberRef: FiberRef<A>,
  parentStack: List<Tuple<[FiberId.Runtime, A]>>,
  childStack: List.NonEmpty<Tuple<[FiberId.Runtime, A]>>
): List.NonEmpty<A> {
  return combineLoop(
    parentStack.reverse(),
    childStack.reverse(),
    fiberRef.initial(),
    fiberRef.initial()
  );
}

/**
 * @tsplus tailrec
 */
function combineLoop<A>(
  parentStack: List<Tuple<[FiberId.Runtime, A]>>,
  childStack: List<Tuple<[FiberId.Runtime, A]>>,
  lastParentValue: A,
  lastChildValue: A
): List.NonEmpty<A> {
  if (parentStack.isNil() || childStack.isNil()) {
    return childStack.map((tuple) => tuple.get(1)).prepend(lastChildValue);
  }

  const { tuple: [parentId, parentValue] } = parentStack.head;
  const parentTail = parentStack.tail;

  const { tuple: [childId, childValue] } = childStack.head;
  const childTail = childStack.tail;

  if (parentId == childId) {
    return combineLoop(parentTail, childTail, parentValue, childValue);
  }

  if (parentId.id < childId.id) {
    return childStack.map((tuple) => tuple.get(1))
      .prepend(childValue)
      .prepend(lastChildValue)
      .prepend(lastParentValue);
  }

  return childStack.map((tuple) => tuple.get(1))
    .prepend(childValue)
    .prepend(lastChildValue);
}
