import type * as Effect from "../Effect.js"
import * as Equal from "../Equal.js"
import type * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import type * as FiberRefs from "../FiberRefs.js"
import { dual, pipe } from "../Function.js"
import * as HashSet from "../HashSet.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as Arr from "../ReadonlyArray.js"
import * as core from "./core.js"

/** @internal */
export function unsafeMake(
  fiberRefLocals: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>>
): FiberRefs.FiberRefs {
  return new FiberRefsImpl(fiberRefLocals)
}

/** @internal */
export function empty(): FiberRefs.FiberRefs {
  return unsafeMake(new Map())
}

/** @internal */
export const FiberRefsSym: FiberRefs.FiberRefsSym = Symbol.for("effect/FiberRefs") as FiberRefs.FiberRefsSym

/** @internal */
export class FiberRefsImpl implements FiberRefs.FiberRefs {
  readonly [FiberRefsSym]: FiberRefs.FiberRefsSym = FiberRefsSym
  constructor(
    readonly locals: Map<
      FiberRef.FiberRef<any>,
      Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>
    >
  ) {
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
const findAncestor = (
  _ref: FiberRef.FiberRef<any>,
  _parentStack: ReadonlyArray<readonly [FiberId.Runtime, unknown]>,
  _childStack: ReadonlyArray<readonly [FiberId.Runtime, unknown]>,
  _childModified = false
): readonly [unknown, boolean] => {
  const ref = _ref
  let parentStack = _parentStack
  let childStack = _childStack
  let childModified = _childModified
  let ret: readonly [unknown, boolean] | undefined = undefined
  while (ret === undefined) {
    if (Arr.isNonEmptyReadonlyArray(parentStack) && Arr.isNonEmptyReadonlyArray(childStack)) {
      const parentFiberId = Arr.headNonEmpty(parentStack)[0]
      const parentAncestors = Arr.tailNonEmpty(parentStack)
      const childFiberId = Arr.headNonEmpty(childStack)[0]
      const childRefValue = Arr.headNonEmpty(childStack)[1]
      const childAncestors = Arr.tailNonEmpty(childStack)
      if (parentFiberId.startTimeMillis < childFiberId.startTimeMillis) {
        childStack = childAncestors
        childModified = true
      } else if (parentFiberId.startTimeMillis > childFiberId.startTimeMillis) {
        parentStack = parentAncestors
      } else {
        if (parentFiberId.id < childFiberId.id) {
          childStack = childAncestors
          childModified = true
        } else if (parentFiberId.id > childFiberId.id) {
          parentStack = parentAncestors
        } else {
          ret = [childRefValue, childModified] as const
        }
      }
    } else {
      ret = [ref.initial, true] as const
    }
  }
  return ret
}

/** @internal */
export const joinAs = dual<
  (fiberId: FiberId.Runtime, that: FiberRefs.FiberRefs) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  (self: FiberRefs.FiberRefs, fiberId: FiberId.Runtime, that: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
>(3, (self, fiberId, that) => {
  const parentFiberRefs = new Map(self.locals)
  for (const [fiberRef, childStack] of that.locals) {
    const childValue = Arr.headNonEmpty(childStack)[1]
    if (!Equal.equals(Arr.headNonEmpty(childStack)[0], fiberId)) {
      if (!parentFiberRefs.has(fiberRef)) {
        if (Equal.equals(childValue, fiberRef.initial)) {
          continue
        }
        parentFiberRefs.set(
          fiberRef,
          [[fiberId, fiberRef.join(fiberRef.initial, childValue)]]
        )
        continue
      }
      const parentStack = parentFiberRefs.get(fiberRef)!
      const [ancestor, wasModified] = findAncestor(
        fiberRef,
        parentStack,
        childStack
      )
      if (wasModified) {
        const patch = fiberRef.diff(ancestor, childValue)
        const oldValue = Arr.headNonEmpty(parentStack)[1]
        const newValue = fiberRef.join(oldValue, fiberRef.patch(patch)(oldValue))
        if (!Equal.equals(oldValue, newValue)) {
          let newStack: Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>
          const parentFiberId = Arr.headNonEmpty(parentStack)[0]
          if (Equal.equals(parentFiberId, fiberId)) {
            newStack = Arr.prepend([parentFiberId, newValue] as const)(
              Arr.tailNonEmpty(parentStack)
            ) as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>
          } else {
            newStack = Arr.prepend([fiberId, newValue] as const)(
              parentStack
            ) as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>
          }
          parentFiberRefs.set(fiberRef, newStack)
        }
      }
    }
  }
  return new FiberRefsImpl(new Map(parentFiberRefs))
})

/** @internal */
export const forkAs = dual<
  (childId: FiberId.Runtime) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  (self: FiberRefs.FiberRefs, childId: FiberId.Runtime) => FiberRefs.FiberRefs
>(2, (self, childId) => {
  const map = new Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, unknown]>>()
  for (const [fiberRef, stack] of self.locals.entries()) {
    const oldValue = Arr.headNonEmpty(stack)[1]
    const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
    if (Equal.equals(oldValue, newValue)) {
      map.set(fiberRef, stack)
    } else {
      map.set(fiberRef, Arr.prepend([childId, newValue] as const)(stack) as typeof stack)
    }
  }
  return new FiberRefsImpl(map)
})

/** @internal */
export const fiberRefs = (self: FiberRefs.FiberRefs) => HashSet.fromIterable(self.locals.keys())

/** @internal */
export const setAll = (self: FiberRefs.FiberRefs): Effect.Effect<never, never, void> =>
  core.forEachSequentialDiscard(
    fiberRefs(self),
    (fiberRef) => core.fiberRefSet(fiberRef, getOrDefault(self, fiberRef))
  )

/** @internal */
export const delete_ = dual<
  <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  <A>(self: FiberRefs.FiberRefs, fiberRef: FiberRef.FiberRef<A>) => FiberRefs.FiberRefs
>(2, (self, fiberRef) => {
  const locals = new Map(self.locals)
  locals.delete(fiberRef)
  return new FiberRefsImpl(locals)
})

/** @internal */
export const get = dual<
  <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs.FiberRefs) => Option.Option<A>,
  <A>(self: FiberRefs.FiberRefs, fiberRef: FiberRef.FiberRef<A>) => Option.Option<A>
>(2, (self, fiberRef) => {
  if (!self.locals.has(fiberRef)) {
    return Option.none()
  }
  return Option.some(Arr.headNonEmpty(self.locals.get(fiberRef)!)[1])
})

/** @internal */
export const getOrDefault = dual<
  <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs.FiberRefs) => A,
  <A>(self: FiberRefs.FiberRefs, fiberRef: FiberRef.FiberRef<A>) => A
>(2, (self, fiberRef) => pipe(get(self, fiberRef), Option.getOrElse(() => fiberRef.initial)))

/** @internal */
export const updatedAs = dual<
  <A>(
    options: {
      readonly fiberId: FiberId.Runtime
      readonly fiberRef: FiberRef.FiberRef<A>
      readonly value: A
    }
  ) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  <A>(
    self: FiberRefs.FiberRefs,
    options: {
      readonly fiberId: FiberId.Runtime
      readonly fiberRef: FiberRef.FiberRef<A>
      readonly value: A
    }
  ) => FiberRefs.FiberRefs
>(2, <A>(self: FiberRefs.FiberRefs, { fiberId, fiberRef, value }: {
  readonly fiberId: FiberId.Runtime
  readonly fiberRef: FiberRef.FiberRef<A>
  readonly value: A
}) => {
  const oldStack = self.locals.has(fiberRef) ?
    self.locals.get(fiberRef)! :
    Arr.empty<readonly [FiberId.Runtime, any]>()

  let newStack: ReadonlyArray<readonly [FiberId.Runtime, A]> | undefined

  if (Arr.isEmptyReadonlyArray(oldStack)) {
    newStack = Arr.of([fiberId, value] as const)
  } else {
    const [currentId, currentValue] = Arr.headNonEmpty(
      oldStack as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>
    )
    if (Equal.equals(currentId, fiberId)) {
      if (Equal.equals(currentValue, value)) {
        return self
      } else {
        newStack = Arr.prepend([fiberId, value] as const)(
          Arr.tailNonEmpty(oldStack as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>)
        )
      }
    } else {
      newStack = Arr.prepend([fiberId, value] as const)(oldStack)
    }
  }

  const locals = new Map(self.locals)
  return new FiberRefsImpl(
    locals.set(fiberRef, newStack as Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>)
  )
})
