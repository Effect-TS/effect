import * as Arr from "../Array.js"
import type * as Effect from "../Effect.js"
import * as Equal from "../Equal.js"
import type * as FiberId from "../FiberId.js"
import type * as FiberRef from "../FiberRef.js"
import type * as FiberRefs from "../FiberRefs.js"
import { dual, pipe } from "../Function.js"
import * as HashSet from "../HashSet.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import * as core from "./core.js"

/** @internal */
export function unsafeMake(
  fiberRefLocals: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>>
): FiberRefs.FiberRefs {
  const forkRefs = Arr.fromIterable(fiberRefLocals.keys()).filter(
    (ref) => (ref as any)._isForkIdentity !== true
  )
  return new FiberRefsImpl(fiberRefLocals, forkRefs)
}

/** @internal */
export function empty(): FiberRefs.FiberRefs {
  return new FiberRefsImpl(new Map(), Arr.empty())
}

/** @internal */
export const FiberRefsSym: FiberRefs.FiberRefsSym = Symbol.for("effect/FiberRefs") as FiberRefs.FiberRefsSym

/** @internal */
export class FiberRefsImpl implements FiberRefs.FiberRefs {
  readonly [FiberRefsSym]: FiberRefs.FiberRefsSym = FiberRefsSym
  constructor(
    readonly locals: Map<
      FiberRef.FiberRef<any>,
      Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>
    >,
    readonly forkRefs: ReadonlyArray<FiberRef.FiberRef<any>> = Arr.empty()
  ) {}
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
const findAncestor = (
  _ref: FiberRef.FiberRef<any>,
  _parentStack: ReadonlyArray<readonly [FiberId.Single, unknown]>,
  _childStack: ReadonlyArray<readonly [FiberId.Single, unknown]>,
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
  (fiberId: FiberId.Single, that: FiberRefs.FiberRefs) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  (self: FiberRefs.FiberRefs, fiberId: FiberId.Single, that: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
>(3, (self, fiberId, that) => {
  // Fast-path for unchanged or empty child fiber refs (Bug #6308)
  if (self === that || that.locals.size === 0) {
    return self
  }
  const parentFiberRefs = new Map(self.locals)
  let combinedForkRefs = (self as FiberRefsImpl).forkRefs
  that.locals.forEach((childStack, fiberRef) => {
    const childValue = childStack[0][1]
    if (!childStack[0][0][Equal.symbol](fiberId)) {
      if (!parentFiberRefs.has(fiberRef)) {
        if (Equal.equals(childValue, fiberRef.initial)) {
          return
        }
        parentFiberRefs.set(
          fiberRef,
          [[fiberId, fiberRef.join(fiberRef.initial, childValue)]]
        )
        if ((fiberRef as any)._isForkIdentity !== true && !combinedForkRefs.includes(fiberRef)) {
          combinedForkRefs = [...combinedForkRefs, fiberRef]
        }
        return
      }
      const parentStack = parentFiberRefs.get(fiberRef)!
      const [ancestor, wasModified] = findAncestor(
        fiberRef,
        parentStack,
        childStack
      )
      if (wasModified) {
        const patch = fiberRef.diff(ancestor, childValue)
        const oldValue = parentStack[0][1]
        const newValue = fiberRef.join(oldValue, fiberRef.patch(patch)(oldValue))
        if (!Equal.equals(oldValue, newValue)) {
          let newStack: Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, unknown]>
          const parentFiberId = parentStack[0][0]
          if (parentFiberId[Equal.symbol](fiberId)) {
            newStack = [[parentFiberId, newValue] as const, ...parentStack.slice(1)]
          } else {
            newStack = [[fiberId, newValue] as const, ...parentStack]
          }
          parentFiberRefs.set(fiberRef, newStack)
          if ((fiberRef as any)._isForkIdentity !== true && !combinedForkRefs.includes(fiberRef)) {
            combinedForkRefs = [...combinedForkRefs, fiberRef]
          }
        }
      }
    }
  })
  return new FiberRefsImpl(parentFiberRefs, combinedForkRefs)
})

/** @internal */
export const forkAs = dual<
  (childId: FiberId.Single) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  (self: FiberRefs.FiberRefs, childId: FiberId.Single) => FiberRefs.FiberRefs
>(2, (self, childId) => {
  // O(1) fork fast-path when no custom fork refs exist (Bug #6308)
  const forkRefs = (self as FiberRefsImpl).forkRefs
  if (forkRefs.length === 0) {
    return self
  }
  let map: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, unknown]>> | undefined =
    undefined
  for (let i = 0; i < forkRefs.length; i++) {
    const fiberRef = forkRefs[i]
    const stack = self.locals.get(fiberRef)
    if (stack === undefined) continue
    const oldValue = stack[0][1]
    const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
    if (!Equal.equals(oldValue, newValue)) {
      if (map === undefined) {
        map = new Map(self.locals)
      }
      map.set(fiberRef, [[childId, newValue] as const, ...stack])
    }
  }
  return map === undefined ? self : new FiberRefsImpl(map, forkRefs)
})

const unsafeForkAs = (
  self: FiberRefs.FiberRefs,
  map: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>>,
  fiberId: FiberId.Single
) => {
  const forkRefs = (self as FiberRefsImpl).forkRefs
  for (let i = 0; i < forkRefs.length; i++) {
    const fiberRef = forkRefs[i]
    const stack = self.locals.get(fiberRef)
    if (stack === undefined) continue
    const oldValue = stack[0][1]
    const newValue = fiberRef.patch(fiberRef.fork)(oldValue)
    if (!Equal.equals(oldValue, newValue)) {
      map.set(fiberRef, [[fiberId, newValue] as const, ...stack])
    }
  }
}

/** @internal */
export const fiberRefs = (self: FiberRefs.FiberRefs) => HashSet.fromIterable(self.locals.keys())

/** @internal */
export const setAll = (self: FiberRefs.FiberRefs): Effect.Effect<void> =>
  core.forEachSequentialDiscard(
    fiberRefs(self),
    (fiberRef) => core.fiberRefSet(fiberRef, getOrDefault(self, fiberRef))
  )

/** @internal */
export const delete_ = dual<
  <A>(fiberRef: FiberRef.FiberRef<A>) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  <A>(self: FiberRefs.FiberRefs, fiberRef: FiberRef.FiberRef<A>) => FiberRefs.FiberRefs
>(2, (self, fiberRef) => {
  if (!self.locals.has(fiberRef)) {
    return self
  }
  const locals = new Map(self.locals)
  locals.delete(fiberRef)
  let forkRefs = (self as FiberRefsImpl).forkRefs
  if ((fiberRef as any)._isForkIdentity !== true && forkRefs.includes(fiberRef)) {
    forkRefs = forkRefs.filter((r) => r !== fiberRef)
  }
  return new FiberRefsImpl(locals, forkRefs)
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
export const updateAs = dual<
  <A>(
    options: {
      readonly fiberId: FiberId.Single
      readonly fiberRef: FiberRef.FiberRef<A>
      readonly value: A
    }
  ) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  <A>(
    self: FiberRefs.FiberRefs,
    options: {
      readonly fiberId: FiberId.Single
      readonly fiberRef: FiberRef.FiberRef<A>
      readonly value: A
    }
  ) => FiberRefs.FiberRefs
>(2, <A>(self: FiberRefs.FiberRefs, { fiberId, fiberRef, value }: {
  readonly fiberId: FiberId.Single
  readonly fiberRef: FiberRef.FiberRef<A>
  readonly value: A
}) => {
  // Fast-path: return self when identical value already set for current fiberId (Bug #6308)
  const oldStack = self.locals.get(fiberRef)
  if (oldStack !== undefined) {
    const [currentId, currentValue] = oldStack[0]
    if (currentId[Equal.symbol](fiberId) && Equal.equals(currentValue, value)) {
      return self
    }
  }
  const isCustomFork = (fiberRef as any)._isForkIdentity !== true
  if (self.locals.size === 0) {
    return new FiberRefsImpl(
      new Map([[fiberRef, [[fiberId, value] as const]]]),
      isCustomFork ? [fiberRef] : Arr.empty()
    )
  }
  const locals = new Map(self.locals)
  unsafeUpdateAs(locals, fiberId, fiberRef, value)
  let forkRefs = (self as FiberRefsImpl).forkRefs
  if (isCustomFork && (oldStack === undefined || !forkRefs.includes(fiberRef))) {
    forkRefs = [...forkRefs, fiberRef]
  }
  return new FiberRefsImpl(locals, forkRefs)
})

const unsafeUpdateAs = (
  locals: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>>,
  fiberId: FiberId.Single,
  fiberRef: FiberRef.FiberRef<any>,
  value: any
) => {
  const oldStack: ReadonlyArray<readonly [FiberId.Single, any]> = locals.get(fiberRef) ?? []
  let newStack: Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]> | undefined

  if (Arr.isNonEmptyReadonlyArray(oldStack)) {
    const [currentId, currentValue] = Arr.headNonEmpty(oldStack)
    if (currentId[Equal.symbol](fiberId)) {
      if (Equal.equals(currentValue, value)) {
        return
      } else {
        newStack = [
          [fiberId, value] as const,
          ...oldStack.slice(1)
        ]
      }
    } else {
      newStack = [
        [fiberId, value] as const,
        ...oldStack
      ]
    }
  } else {
    newStack = [[fiberId, value] as const]
  }

  locals.set(fiberRef, newStack)
}

/** @internal */
export const updateManyAs = dual<
  (
    options: {
      readonly forkAs?: FiberId.Single | undefined
      readonly entries: Arr.NonEmptyReadonlyArray<
        readonly [FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>]
      >
    }
  ) => (self: FiberRefs.FiberRefs) => FiberRefs.FiberRefs,
  (
    self: FiberRefs.FiberRefs,
    options: {
      readonly forkAs?: FiberId.Single | undefined
      readonly entries: Arr.NonEmptyReadonlyArray<
        readonly [FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>]
      >
    }
  ) => FiberRefs.FiberRefs
>(2, (self: FiberRefs.FiberRefs, { entries, forkAs }: {
  readonly forkAs?: FiberId.Single | undefined
  readonly entries: Arr.NonEmptyReadonlyArray<
    readonly [FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Single, any]>]
  >
}) => {
  if (self.locals.size === 0) {
    const forkRefs = entries
      .filter(([ref]) => (ref as any)._isForkIdentity !== true)
      .map(([ref]) => ref)
    return new FiberRefsImpl(new Map(entries), forkRefs)
  }

  const locals = new Map(self.locals)
  if (forkAs !== undefined && (self as FiberRefsImpl).forkRefs.length > 0) {
    unsafeForkAs(self, locals, forkAs)
  }
  entries.forEach(([fiberRef, values]) => {
    if (values.length === 1) {
      unsafeUpdateAs(locals, values[0][0], fiberRef, values[0][1])
    } else {
      values.forEach(([fiberId, value]) => {
        unsafeUpdateAs(locals, fiberId, fiberRef, value)
      })
    }
  })
  let forkRefs = (self as FiberRefsImpl).forkRefs
  for (const [ref] of entries) {
    if ((ref as any)._isForkIdentity !== true && !forkRefs.includes(ref)) {
      forkRefs = [...forkRefs, ref]
    }
  }
  return new FiberRefsImpl(locals, forkRefs)
})
