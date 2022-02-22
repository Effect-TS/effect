// ets_tracing: off

import * as HS from "../Collections/Immutable/HashSet/index.js"
import * as L from "../Collections/Immutable/List/core.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { FiberID } from "../Fiber/id.js"
import { equalsFiberID } from "../Fiber/id.js"
import type { Trace } from "../Fiber/tracing.js"
import { tuple } from "../Function/index.js"
import * as IO from "../IO/index.js"
import * as O from "../Option/index.js"
import { Stack } from "../Stack/index.js"
import * as St from "../Structural/index.js"
import type { HasUnify } from "../Utils/index.js"

/**
 * Cause is a Free Semiring structure that allows tracking of multiple error causes.
 */
export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E> | Traced<E>

export const CauseSym = Symbol()

export function isCause(self: unknown): self is Cause<unknown> {
  return typeof self === "object" && self != null && CauseSym in self
}

const _emptyHash = St.opt(St.randomInt())

export interface Empty extends HasUnify {}
export class Empty implements St.HasEquals, St.HasHash {
  readonly _tag = "Empty";
  readonly [CauseSym]: typeof CauseSym = CauseSym;

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return _emptyHash
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      if (that._tag === "Empty") {
        return true
      } else if (that._tag === "Then") {
        return (
          (yield* _(self.equalsSafe(that.left))) &&
          (yield* _(self.equalsSafe(that.right)))
        )
      } else if (that._tag === "Both") {
        return (
          (yield* _(self.equalsSafe(that.left))) &&
          (yield* _(self.equalsSafe(that.right)))
        )
      } else {
        return false
      }
    })
  }
}

export const empty: Cause<never> = new Empty()

export interface Fail<E> extends HasUnify {}
export class Fail<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Fail";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly value: E) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.value))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Fail": {
          return St.equals(self.value, that.value)
        }
        case "Then": {
          return yield* _(sym(zero)(self, that))
        }
        case "Both": {
          return yield* _(sym(zero)(self, that))
        }
        case "Traced": {
          return yield* _(self.equalsSafe(that.cause))
        }
      }
      return false
    })
  }
}

export interface Die extends HasUnify {}
export class Die implements St.HasEquals, St.HasHash, HasUnify {
  readonly _tag = "Die";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly value: unknown) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.value))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Die": {
          return St.equals(self.value, that.value)
        }
        case "Then": {
          return yield* _(sym(zero)(self, that))
        }
        case "Both": {
          return yield* _(sym(zero)(self, that))
        }
        case "Traced": {
          return yield* _(self.equalsSafe(that.cause))
        }
      }
      return false
    })
  }
}

export interface Interrupt extends HasUnify {}
export class Interrupt implements St.HasEquals, St.HasHash, HasUnify {
  readonly _tag = "Interrupt";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly fiberId: FiberID) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.fiberId))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Interrupt": {
          return equalsFiberID(self.fiberId, that.fiberId)
        }
        case "Then": {
          return yield* _(sym(zero)(self, that))
        }
        case "Both": {
          return yield* _(sym(zero)(self, that))
        }
        case "Traced": {
          return yield* _(self.equalsSafe(that.cause))
        }
      }
      return false
    })
  }
}

export interface Traced<E> extends HasUnify {}
export class Traced<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Traced";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly cause: Cause<E>, readonly trace: Trace) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return this.cause[St.hashSym]
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self: Traced<E> = this
    return IO.gen(function* (_) {
      if (that._tag === "Traced") {
        return yield* _(self.cause.equalsSafe(that.cause))
      }
      return yield* _(self.cause.equalsSafe(that))
    })
  }
}

export interface Then<E> extends HasUnify {}
export class Then<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Then";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return hashCode(this)
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Traced": {
          return yield* _(self.equalsSafe(that.cause))
        }
      }
      return (
        (yield* _(self.eq(that))) ||
        (yield* _(sym(associativeThen)(self, that))) ||
        (yield* _(sym(distributiveThen)(self, that))) ||
        (yield* _(sym(zero)(self, that)))
      )
    })
  }

  private eq(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    if (that._tag === "Then") {
      return IO.gen(function* (_) {
        return (
          (yield* _(self.left.equalsSafe(that.left))) &&
          (yield* _(self.right.equalsSafe(that.right)))
        )
      })
    }
    return IO.succeed(false)
  }
}

export interface Both<E> extends HasUnify {}
export class Both<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Both";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  get [St.hashSym](): number {
    return hashCode(this)
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Traced": {
          return yield* _(self.equalsSafe(that.cause))
        }
      }
      return (
        (yield* _(self.eq(that))) ||
        (yield* _(sym(associativeBoth)(self, that))) ||
        (yield* _(sym(distributiveBoth)(self, that))) ||
        (yield* _(commutativeBoth(self, that))) ||
        (yield* _(sym(zero)(self, that)))
      )
    })
  }

  private eq(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    if (that._tag === "Both") {
      return IO.gen(function* (_) {
        return (
          (yield* _(self.left.equalsSafe(that.left))) &&
          (yield* _(self.right.equalsSafe(that.right)))
        )
      })
    }
    return IO.succeed(false)
  }
}

export function fail<E>(value: E): Cause<E> {
  return new Fail(value)
}

export function traced<E>(cause: Cause<E>, trace: Trace): Cause<E> {
  if (
    L.isEmpty(trace.executionTrace) &&
    L.isEmpty(trace.stackTrace) &&
    O.isNone(trace.parentTrace)
  ) {
    return cause
  }
  return new Traced(cause, trace)
}

export function die(value: unknown): Cause<never> {
  return new Die(value)
}

export function interrupt(fiberId: FiberID): Cause<never> {
  return new Interrupt(fiberId)
}

export function combineSeq<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Then<E1 | E2>(left, right)
}

export function combinePar<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Both<E1 | E2>(left, right)
}

/**
 * Determines if the `Cause` is empty.
 */
export function isEmpty<E>(cause: Cause<E>) {
  if (
    cause._tag === "Empty" ||
    (cause._tag === "Traced" && cause.cause._tag === "Empty")
  ) {
    return true
  }
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined = cause
  while (current) {
    switch (current._tag) {
      case "Die": {
        return false
      }
      case "Fail": {
        return false
      }
      case "Interrupt": {
        return false
      }
      case "Then": {
        causes = new Stack(current.right, causes)
        current = current.left
        break
      }
      case "Both": {
        causes = new Stack(current.right, causes)
        current = current.left
        break
      }
      case "Traced": {
        current = current.cause
        break
      }
      default: {
        current = undefined
      }
    }
    if (!current && causes) {
      current = causes.value
      causes = causes.previous
    }
  }

  return true
}

function associativeThen<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (
      self._tag === "Then" &&
      self.left._tag === "Then" &&
      that._tag === "Then" &&
      that.right._tag === "Then"
    ) {
      const al = self.left.left
      const bl = self.left.right
      const cl = self.right
      const ar = that.left
      const br = that.right.left
      const cr = that.right.right
      return (
        (yield* _(al.equalsSafe(ar))) &&
        (yield* _(bl.equalsSafe(br))) &&
        (yield* _(cl.equalsSafe(cr)))
      )
    }
    return false
  })
}

function distributiveThen<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (
      self._tag === "Then" &&
      self.right._tag === "Both" &&
      that._tag === "Both" &&
      that.left._tag === "Then" &&
      that.right._tag === "Then"
    ) {
      const al = self.left
      const bl = self.right.left
      const cl = self.right.right
      const ar1 = that.left.left
      const br = that.left.right
      const ar2 = that.right.left
      const cr = that.right.right

      if (
        (yield* _(ar1.equalsSafe(ar2))) &&
        (yield* _(al.equalsSafe(ar1))) &&
        (yield* _(bl.equalsSafe(br))) &&
        (yield* _(cl.equalsSafe(cr)))
      ) {
        return true
      }
    }
    if (
      self._tag === "Then" &&
      self.left._tag === "Both" &&
      that._tag === "Both" &&
      that.left._tag === "Then" &&
      that.right._tag === "Then"
    ) {
      const al = self.left.left
      const bl = self.left.right
      const cl = self.right
      const ar = that.left.left
      const cr1 = that.left.right
      const br = that.right.left
      const cr2 = that.right.right

      if (
        (yield* _(cr1.equalsSafe(cr2))) &&
        (yield* _(al.equalsSafe(ar))) &&
        (yield* _(bl.equalsSafe(br))) &&
        (yield* _(cl.equalsSafe(cr1)))
      ) {
        return true
      }
    }
    return false
  })
}

function associativeBoth<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (
      self._tag === "Both" &&
      self.left._tag === "Both" &&
      that._tag === "Both" &&
      that.right._tag === "Both"
    ) {
      const al = self.left.left
      const bl = self.left.right
      const cl = self.right
      const ar = that.left
      const br = that.right.left
      const cr = that.right.right
      return (
        (yield* _(al.equalsSafe(ar))) &&
        (yield* _(bl.equalsSafe(br))) &&
        (yield* _(cl.equalsSafe(cr)))
      )
    }
    return false
  })
}

function distributiveBoth<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (
      self._tag === "Both" &&
      self.left._tag === "Then" &&
      self.right._tag === "Then" &&
      that._tag === "Then" &&
      that.right._tag === "Both"
    ) {
      const al1 = self.left.left
      const bl = self.left.right
      const al2 = self.right.left
      const cl = self.right.right
      const ar = that.left
      const br = that.right.left
      const cr = that.right.right

      if (
        (yield* _(al1.equalsSafe(al2))) &&
        (yield* _(al1.equalsSafe(ar))) &&
        (yield* _(bl.equalsSafe(br))) &&
        (yield* _(cl.equalsSafe(cr)))
      ) {
        return true
      }
    }
    if (
      self._tag === "Both" &&
      self.left._tag === "Then" &&
      self.right._tag === "Then" &&
      that._tag === "Then" &&
      that.left._tag === "Both"
    ) {
      const al = self.left.left
      const cl1 = self.left.right
      const bl = self.right.left
      const cl2 = self.right.right
      const ar = that.left.left
      const br = that.left.right
      const cr = that.right

      if (
        (yield* _(cl1.equalsSafe(cl2))) &&
        (yield* _(al.equalsSafe(ar))) &&
        (yield* _(bl.equalsSafe(br))) &&
        (yield* _(cl1.equalsSafe(cr)))
      ) {
        return true
      }
    }
    return false
  })
}

function commutativeBoth<A>(self: Both<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (that._tag === "Both") {
      return (
        (yield* _(self.left.equalsSafe(that.right))) &&
        (yield* _(self.right.equalsSafe(that.left)))
      )
    }
    return false
  })
}

function zero<A>(self: Cause<A>, that: Cause<A>) {
  if (self._tag === "Then" && self.right._tag === "Empty") {
    return self.left.equalsSafe(that)
  }
  if (self._tag === "Then" && self.left._tag === "Empty") {
    return self.right.equalsSafe(that)
  }
  if (self._tag === "Both" && self.right._tag === "Empty") {
    return self.left.equalsSafe(that)
  }
  if (self._tag === "Both" && self.left._tag === "Empty") {
    return self.right.equalsSafe(that)
  }
  return IO.succeed(false)
}

function sym<A>(
  f: (a: Cause<A>, b: Cause<A>) => IO.IO<boolean>
): (a: Cause<A>, b: Cause<A>) => IO.IO<boolean> {
  return (l, r) =>
    IO.gen(function* (_) {
      return (yield* _(f(l, r))) || (yield* _(f(r, l)))
    })
}

export function equals<A>(self: Cause<A>, that: Cause<A>): boolean {
  return IO.run(self.equalsSafe(that))
}

function stepLoop<A>(
  cause: Cause<A>,
  stack: L.List<Cause<A>>,
  parallel: HS.HashSet<Cause<A>>,
  sequential: L.List<Cause<A>>
): Tp.Tuple<[HS.HashSet<Cause<A>>, L.List<Cause<A>>]> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (cause._tag) {
      case "Empty": {
        if (L.isEmpty(stack)) {
          return Tp.tuple(parallel, sequential)
        } else {
          cause = L.unsafeFirst(stack)!
          stack = L.tail(stack)
        }
        break
      }
      case "Traced": {
        cause = cause.cause
        break
      }
      case "Both": {
        stack = L.prepend_(stack, cause.right)
        cause = cause.left
        break
      }
      case "Then": {
        const left = cause.left
        const right = cause.right
        switch (left._tag) {
          case "Traced": {
            cause = combineSeq(left.cause, right)
            break
          }
          case "Empty": {
            cause = cause.right
            break
          }
          case "Then": {
            cause = combineSeq(left.left, combineSeq(left.right, right))
            break
          }
          case "Both": {
            cause = combinePar(
              combineSeq(left.left, right),
              combineSeq(left.right, right)
            )
            break
          }
          default: {
            cause = left
            sequential = L.prepend_(sequential, right)
          }
        }
        break
      }
      default: {
        if (L.isEmpty(stack)) {
          return Tp.tuple(HS.add_(parallel, cause), sequential)
        } else {
          parallel = HS.add_(parallel, cause)
          cause = L.unsafeFirst(stack)!
          stack = L.tail(stack)
          break
        }
      }
    }
  }
  throw new Error("Bug")
}

function step<A>(self: Cause<A>): Tp.Tuple<[HS.HashSet<Cause<A>>, L.List<Cause<A>>]> {
  return stepLoop(self, L.empty(), HS.make(), L.empty())
}

function flattenLoop<A>(
  causes: L.List<Cause<A>>,
  flattened: L.List<HS.HashSet<Cause<A>>>
): L.List<HS.HashSet<Cause<A>>> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = L.reduce_(
      causes,
      tuple(HS.make<Cause<A>>(), L.empty<Cause<A>>()),
      ([parallel, sequential], cause) => {
        const {
          tuple: [set, seq]
        } = step(cause)
        return tuple(HS.union_(parallel, set), L.concat_(sequential, seq))
      }
    )
    const updated = HS.size(parallel) > 0 ? L.prepend_(flattened, parallel) : flattened
    if (L.isEmpty(sequential)) {
      return L.reverse(updated)
    } else {
      causes = sequential
      flattened = updated
    }
  }
  throw new Error("Bug")
}

function flatten<A>(self: Cause<A>) {
  return flattenLoop(L.of(self), L.empty())
}

function hashCode<A>(self: Cause<A>) {
  const flat = flatten(self)
  const size = L.size(flat)
  let head
  if (size === 0) {
    return _emptyHash
  } else if (size === 1 && (head = L.unsafeFirst(flat)!) && HS.size(head) === 1) {
    return L.unsafeFirst(L.from(head))![St.hashSym]
  } else {
    return St.hashIterator(flat[Symbol.iterator]())
  }
}
