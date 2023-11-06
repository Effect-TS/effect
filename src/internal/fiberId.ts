import { Equal } from "../Equal.js"
import type { FiberId } from "../FiberId.js"
import { dual, pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import { Hash } from "../Hash.js"
import { HashSet } from "../HashSet.js"
import { NodeInspectSymbol, toJSON, toString } from "../Inspectable.js"
import { MutableRef } from "../MutableRef.js"
import { Option } from "../Option.js"
import { hasProperty } from "../Predicate.js"

/** @internal */
const FiberIdSymbolKey = "effect/FiberId"

/** @internal */
export const FiberIdTypeId: FiberId.FiberIdTypeId = Symbol.for(
  FiberIdSymbolKey
) as FiberId.FiberIdTypeId

/** @internal */
const OP_NONE = "None" as const

/** @internal */
export type OP_NONE = typeof OP_NONE

/** @internal */
const OP_RUNTIME = "Runtime" as const

/** @internal */
export type OP_RUNTIME = typeof OP_RUNTIME

/** @internal */
const OP_COMPOSITE = "Composite" as const

/** @internal */
export type OP_COMPOSITE = typeof OP_COMPOSITE

/** @internal */
class None implements FiberId.None {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly _tag = OP_NONE;
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(FiberIdSymbolKey),
      Hash.combine(Hash.hash(this._tag))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isFiberId(that) && that._tag === OP_NONE
  }
  toString() {
    return toString(this.toJSON())
  }
  toJSON() {
    return {
      _id: "FiberId",
      _tag: this._tag
    }
  }
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
class Runtime implements FiberId.Runtime {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly _tag = OP_RUNTIME
  constructor(
    readonly id: number,
    readonly startTimeMillis: number
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(FiberIdSymbolKey),
      Hash.combine(Hash.hash(this._tag)),
      Hash.combine(Hash.hash(this.id)),
      Hash.combine(Hash.hash(this.startTimeMillis))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isFiberId(that) &&
      that._tag === OP_RUNTIME &&
      this.id === that.id &&
      this.startTimeMillis === that.startTimeMillis
  }
  toString() {
    return toString(this.toJSON())
  }
  toJSON() {
    return {
      _id: "FiberId",
      _tag: this._tag,
      id: this.id,
      startTimeMillis: this.startTimeMillis
    }
  }
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
class Composite implements FiberId.Composite {
  readonly [FiberIdTypeId]: FiberId.FiberIdTypeId = FiberIdTypeId
  readonly _tag = OP_COMPOSITE
  constructor(
    readonly left: FiberId,
    readonly right: FiberId
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(FiberIdSymbolKey),
      Hash.combine(Hash.hash(this._tag)),
      Hash.combine(Hash.hash(this.left)),
      Hash.combine(Hash.hash(this.right))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isFiberId(that) &&
      that._tag === OP_COMPOSITE &&
      Equal.equals(this.left, that.left) &&
      Equal.equals(this.right, that.right)
  }
  toString() {
    return toString(this.toJSON())
  }
  toJSON() {
    return {
      _id: "FiberId",
      _tag: this._tag,
      left: toJSON(this.left),
      right: toJSON(this.right)
    }
  }
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/** @internal */
export const none: FiberId = new None()

/** @internal */
export const runtime = (id: number, startTimeMillis: number): FiberId => {
  return new Runtime(id, startTimeMillis)
}

/** @internal */
export const composite = (left: FiberId, right: FiberId): FiberId => {
  return new Composite(left, right)
}

/** @internal */
export const isFiberId = (self: unknown): self is FiberId => hasProperty(self, FiberIdTypeId)

/** @internal */
export const isNone = (self: FiberId): self is FiberId.None => {
  return self._tag === OP_NONE || pipe(toSet(self), HashSet.every((id) => isNone(id)))
}

/** @internal */
export const isRuntime = (self: FiberId): self is FiberId.Runtime => {
  return self._tag === OP_RUNTIME
}

/** @internal */
export const isComposite = (self: FiberId): self is FiberId.Composite => {
  return self._tag === OP_COMPOSITE
}

/** @internal */
export const combine = dual<
  (that: FiberId) => (self: FiberId) => FiberId,
  (self: FiberId, that: FiberId) => FiberId
>(2, (self, that) => {
  if (self._tag === OP_NONE) {
    return that
  }
  if (that._tag === OP_NONE) {
    return self
  }
  return new Composite(self, that)
})

/** @internal */
export const combineAll = (fiberIds: HashSet<FiberId>): FiberId => {
  return pipe(fiberIds, HashSet.reduce(none as FiberId, (a, b) => combine(b)(a)))
}

/** @internal */
export const getOrElse = dual<
  (that: FiberId) => (self: FiberId) => FiberId,
  (self: FiberId, that: FiberId) => FiberId
>(2, (self, that) => isNone(self) ? that : self)

/** @internal */
export const ids = (self: FiberId): HashSet<number> => {
  switch (self._tag) {
    case OP_NONE: {
      return HashSet.empty()
    }
    case OP_RUNTIME: {
      return HashSet.make(self.id)
    }
    case OP_COMPOSITE: {
      return pipe(ids(self.left), HashSet.union(ids(self.right)))
    }
  }
}

const _fiberCounter = globalValue(
  Symbol.for("effect/Fiber/Id/_fiberCounter"),
  () => MutableRef.make(0)
)

/** @internal */
export const make = (id: number, startTimeSeconds: number): FiberId => {
  return new Runtime(id, startTimeSeconds)
}

/** @internal */
export const threadName = (self: FiberId): string => {
  const identifiers = Array.from(ids(self)).map((n) => `#${n}`).join(",")
  return identifiers
}

/** @internal */
export const toOption = (self: FiberId): Option<FiberId> => {
  const fiberIds = toSet(self)
  if (HashSet.size(fiberIds) === 0) {
    return Option.none()
  }
  let first = true
  let acc: FiberId
  for (const fiberId of fiberIds) {
    if (first) {
      acc = fiberId
      first = false
    } else {
      // @ts-expect-error
      acc = pipe(acc, combine(fiberId))
    }
  }
  // @ts-expect-error
  return Option.some(acc)
}

/** @internal */
export const toSet = (self: FiberId): HashSet<FiberId.Runtime> => {
  switch (self._tag) {
    case OP_NONE: {
      return HashSet.empty()
    }
    case OP_RUNTIME: {
      return HashSet.make(self)
    }
    case OP_COMPOSITE: {
      return pipe(toSet(self.left), HashSet.union(toSet(self.right)))
    }
  }
}

/** @internal */
export const unsafeMake = (): FiberId.Runtime => {
  const id = MutableRef.get(_fiberCounter)
  pipe(_fiberCounter, MutableRef.set(id + 1))
  return new Runtime(id, new Date().getTime())
}
