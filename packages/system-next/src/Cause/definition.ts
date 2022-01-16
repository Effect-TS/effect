// ets_tracing: off

import * as HS from "../Collections/Immutable/HashSet"
import * as L from "../Collections/Immutable/List"
import * as Tp from "../Collections/Immutable/Tuple"
import type { FiberId } from "../FiberId"
import { tuple } from "../Function"
import * as IO from "../IO"
import { Stack } from "../Stack"
import * as St from "../Structural"
import type { Trace } from "../Trace"
import * as Tr from "../Trace"
import type { HasUnify } from "../Utils"

// TODO:
// - [ ] renderPretty
// - [ ] squashTrace
// - [ ] squashTraceWith
// - [ ] stripFailures
// - [ ] stripSomeDefects

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const CauseSym = Symbol()

export type Cause<E> =
  | Empty
  | Fail<E>
  | Die
  | Interrupt
  | Stackless<E>
  | Then<E>
  | Both<E>

export interface Empty extends HasUnify {}
export class Empty implements St.HasEquals, St.HasHash {
  readonly _tag = "Empty";

  readonly [CauseSym]: typeof CauseSym = CauseSym

  get [St.hashSym](): number {
    return _emptyHash
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
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
      } else if (that._tag === "Stackless") {
        return yield* _(self.equalsSafe(that.cause))
      } else {
        return false
      }
    })
  }
}

export interface Fail<E> extends HasUnify {}
export class Fail<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Fail";

  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly value: E, readonly trace: Trace) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(St.hash(this.value), St.hashObject(this.trace))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Fail":
          return St.equals(self.value, that.value)
        case "Then":
          return yield* _(sym(zero)(self, that))
        case "Both":
          return yield* _(sym(zero)(self, that))
        case "Stackless":
          return yield* _(self.equalsSafe(that.cause))
        default:
          return false
      }
    })
  }
}

export interface Die extends HasUnify {}
export class Die implements St.HasEquals, St.HasHash {
  readonly _tag = "Die";

  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly value: unknown, readonly trace: Trace) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(St.hash(this.value), St.hashObject(this.trace))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Die":
          return St.equals(self.value, that.value)
        case "Then":
          return yield* _(sym(zero)(self, that))
        case "Both":
          return yield* _(sym(zero)(self, that))
        case "Stackless":
          return yield* _(self.equalsSafe(that.cause))
        default:
          return false
      }
    })
  }
}

export interface Interrupt extends HasUnify {}
export class Interrupt implements St.HasEquals, St.HasHash {
  readonly _tag = "Interrupt";

  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly fiberId: FiberId, readonly trace: Trace) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(St.hash(this.fiberId), St.hashObject(this.trace))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Interrupt":
          return self.fiberId[St.equalsSym](that.fiberId)
        case "Then":
          return yield* _(sym(zero)(self, that))
        case "Both":
          return yield* _(sym(zero)(self, that))
        case "Stackless":
          return yield* _(self.equalsSafe(that.cause))
        default:
          return false
      }
    })
  }
}

export interface Stackless<E> extends HasUnify {}
export class Stackless<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Stackless";

  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly cause: Cause<E>, readonly stackless: boolean) {}

  get [St.hashSym](): number {
    return this.cause[St.hashSym]
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return that._tag === "Stackless"
      ? self.cause.equalsSafe(that.cause)
      : self.cause.equalsSafe(that)
  }
}

export interface Then<E> extends HasUnify {}
export class Then<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Then";

  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  get [St.hashSym](): number {
    return hashCode(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      if (that._tag === "Stackless") {
        return yield* _(self.equalsSafe(that.cause))
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

  get [St.hashSym](): number {
    return hashCode(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && IO.run(this.equalsSafe(that))
  }

  equalsSafe(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      if (that._tag === "Stackless") {
        return yield* _(self.equalsSafe(that.cause))
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
// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

export const empty: Cause<never> = new Empty()

export function die(defect: unknown, trace: Trace = Tr.none): Cause<never> {
  return new Die(defect, trace)
}

export function fail<E>(error: E, trace: Trace = Tr.none): Cause<E> {
  return new Fail(error, trace)
}

export function interrupt(fiberId: FiberId, trace: Trace = Tr.none): Cause<never> {
  return new Interrupt(fiberId, trace)
}

export function stack<E>(cause: Cause<E>): Cause<E> {
  return new Stackless(cause, false)
}

export function stackless<E>(cause: Cause<E>): Cause<E> {
  return new Stackless(cause, true)
}

export function then<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Then<E1 | E2>(left, right)
}

export function both<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Both<E1 | E2>(left, right)
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Determines if the provided value is a `Cause`.
 */
export function isCause(self: unknown): self is Cause<unknown> {
  return typeof self === "object" && self != null && CauseSym in self
}

/**
 * Determines if the `Cause` is empty.
 */
export function isEmpty<E>(cause: Cause<E>): boolean {
  if (
    cause._tag === "Empty" ||
    (cause._tag === "Stackless" && cause.cause._tag === "Empty")
  ) {
    return true
  }
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined = cause
  while (current) {
    switch (current._tag) {
      case "Die":
        return false
      case "Fail":
        return false
      case "Interrupt":
        return false
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
      case "Stackless": {
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

const _emptyHash = St.opt(St.randomInt())

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
      case "Then": {
        const left = cause.left
        const right = cause.right
        switch (left._tag) {
          case "Empty": {
            cause = cause.right
            break
          }
          case "Then": {
            cause = then(left.left, then(left.right, right))
            break
          }
          case "Both": {
            cause = both(then(left.left, right), then(left.right, right))
            break
          }
          case "Stackless": {
            cause = then(left.cause, right)
            break
          }
          default: {
            cause = left
            sequential = L.prepend_(sequential, right)
          }
        }
        break
      }
      case "Both": {
        stack = L.prepend_(stack, cause.right)
        cause = cause.left
        break
      }
      case "Stackless": {
        cause = cause.cause
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

/**
 * Takes one step in evaluating a cause, returning a set of causes that fail
 * in parallel and a list of causes that fail sequentially after those causes.
 */
function step<A>(self: Cause<A>): Tp.Tuple<[HS.HashSet<Cause<A>>, L.List<Cause<A>>]> {
  return stepLoop(self, L.empty(), HS.make(), L.empty())
}

function flattenCauseLoop<A>(
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

/**
 * Flattens a `Cause` to a sequence of sets of causes, where each set represents
 * causes that fail in parallel and sequential sets represent causes that fail
 * after each other.
 */
function flattenCause<E>(self: Cause<E>): L.List<HS.HashSet<Cause<E>>> {
  return flattenCauseLoop(L.of(self), L.empty())
}

function hashCode<E>(self: Cause<E>): number {
  const flat = flattenCause(self)
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

function sym<E>(
  f: (a: Cause<E>, b: Cause<E>) => IO.IO<boolean>
): (a: Cause<E>, b: Cause<E>) => IO.IO<boolean> {
  return (l, r) =>
    IO.gen(function* (_) {
      return (yield* _(f(l, r))) || (yield* _(f(r, l)))
    })
}

function zero<E>(self: Cause<E>, that: Cause<E>): IO.IO<boolean> {
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

function associativeThen<E>(self: Cause<E>, that: Cause<E>): IO.IO<boolean> {
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

function distributiveThen<E>(self: Cause<E>, that: Cause<E>): IO.IO<boolean> {
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

function associativeBoth<E>(self: Cause<E>, that: Cause<E>): IO.IO<boolean> {
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

function distributiveBoth<E>(self: Cause<E>, that: Cause<E>): IO.IO<boolean> {
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

function commutativeBoth<E>(self: Both<E>, that: Cause<E>): IO.IO<boolean> {
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
