import { HashSet } from "../../collection/immutable/HashSet"
import { List } from "../../collection/immutable/List"
import { Tuple } from "../../collection/immutable/Tuple"
import { Stack } from "../../data/Stack"
import type { Trace } from "../../io/Trace/definition"
import { none } from "../../io/Trace/operations/none"
import { IO } from "../../io-light/IO/core"
import * as St from "../../prelude/Structural"
import type { FiberId } from "../FiberId/definition"

// TODO:
// - [ ] renderPretty
// - [ ] squashTrace
// - [ ] squashTraceWith
// - [ ] stripFailures
// - [ ] stripSomeDefects

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const CauseSym = Symbol.for("@effect-ts/core/io/Cause")
export type CauseSym = typeof CauseSym

/**
 * @tsplus type ets/Cause
 */
export interface Cause<E> {
  readonly [CauseSym]: CauseSym
  readonly _E: (_: never) => E
}

/**
 * @tsplus type ets/CauseOps
 */
export interface CauseOps {}
export const Cause: CauseOps = {}

/**
 * @tsplus unify ets/Cause
 */
export function unify<X extends Cause<any>>(
  self: X
): Cause<[X] extends [Cause<infer CX>] ? CX : never> {
  return self
}

export type RealCause<E> =
  | Empty
  | Fail<E>
  | Die
  | Interrupt
  | Stackless<E>
  | Then<E>
  | Both<E>

/**
 * @ets_optimize remove
 */
export function realCause<E>(cause: Cause<E>): asserts cause is RealCause<E> {
  //
}

/**
 * @tsplus fluent ets/Cause isEmptyType
 */
export function isEmptyType<E>(cause: Cause<E>): cause is Empty {
  realCause(cause)
  return cause._tag === "Empty"
}

/**
 * @tsplus fluent ets/Cause isDieType
 */
export function isDieType<E>(cause: Cause<E>): cause is Die {
  realCause(cause)
  return cause._tag === "Die"
}

/**
 * @tsplus fluent ets/Cause isFailType
 */
export function isFailType<E>(cause: Cause<E>): cause is Fail<E> {
  realCause(cause)
  return cause._tag === "Fail"
}

/**
 * @tsplus fluent ets/Cause isInterruptType
 */
export function isInterruptType<E>(cause: Cause<E>): cause is Interrupt {
  realCause(cause)
  return cause._tag === "Interrupt"
}

/**
 * @tsplus fluent ets/Cause isStacklessType
 */
export function isStacklessType<E>(cause: Cause<E>): cause is Stackless<E> {
  realCause(cause)
  return cause._tag === "Stackless"
}

/**
 * @tsplus fluent ets/Cause isThenType
 */
export function isThenType<E>(cause: Cause<E>): cause is Then<E> {
  realCause(cause)
  return cause._tag === "Then"
}

/**
 * @tsplus fluent ets/Cause isBothType
 */
export function isBothType<E>(cause: Cause<E>): cause is Both<E> {
  realCause(cause)
  return cause._tag === "Both"
}

export interface Empty extends Cause<never> {}
export class Empty implements St.HasEquals, St.HasHash {
  readonly _tag = "Empty";

  readonly [CauseSym]: CauseSym = CauseSym

  get [St.hashSym](): number {
    return _emptyHash
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    return IO.gen(function* (_) {
      realCause(that)
      if (that._tag === "Empty") {
        return true
      } else if (that._tag === "Then") {
        return (
          (yield* _(self.__equalsSafe(that.left))) &&
          (yield* _(self.__equalsSafe(that.right)))
        )
      } else if (that._tag === "Both") {
        return (
          (yield* _(self.__equalsSafe(that.left))) &&
          (yield* _(self.__equalsSafe(that.right)))
        )
      } else if (that._tag === "Stackless") {
        return yield* _(self.__equalsSafe(that.cause))
      } else {
        return false
      }
    })
  }
}

export interface Fail<E> extends Cause<E> {}
export class Fail<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Fail";

  readonly [CauseSym]: CauseSym = CauseSym

  constructor(readonly value: E, readonly trace: Trace) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.value))
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    return IO.gen(function* (_) {
      realCause(that)
      switch (that._tag) {
        case "Fail":
          return St.equals(self.value, that.value)
        case "Then":
          return yield* _(sym(zero)(self, that))
        case "Both":
          return yield* _(sym(zero)(self, that))
        case "Stackless":
          return yield* _(self.__equalsSafe(that.cause))
        default:
          return false
      }
    })
  }
}

export interface Die extends Cause<never> {}
export class Die implements St.HasEquals, St.HasHash {
  readonly _tag = "Die";

  readonly [CauseSym]: CauseSym = CauseSym

  constructor(readonly value: unknown, readonly trace: Trace) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.value))
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    return IO.gen(function* (_) {
      realCause(that)
      switch (that._tag) {
        case "Die":
          return St.equals(self.value, that.value)
        case "Then":
          return yield* _(sym(zero)(self, that))
        case "Both":
          return yield* _(sym(zero)(self, that))
        case "Stackless":
          return yield* _(self.__equalsSafe(that.cause))
        default:
          return false
      }
    })
  }
}

export interface Interrupt extends Cause<never> {}
export class Interrupt implements St.HasEquals, St.HasHash {
  readonly _tag = "Interrupt";

  readonly [CauseSym]: CauseSym = CauseSym

  constructor(readonly fiberId: FiberId, readonly trace: Trace) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.fiberId))
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    return IO.gen(function* (_) {
      realCause(that)
      switch (that._tag) {
        case "Interrupt":
          return self.fiberId[St.equalsSym](that.fiberId)
        case "Then":
          return yield* _(sym(zero)(self, that))
        case "Both":
          return yield* _(sym(zero)(self, that))
        case "Stackless":
          return yield* _(self.__equalsSafe(that.cause))
        default:
          return false
      }
    })
  }
}

export interface Stackless<E> extends Cause<E> {}
export class Stackless<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Stackless";

  readonly [CauseSym]: CauseSym = CauseSym

  constructor(readonly cause: Cause<E>, readonly stackless: boolean) {}

  get [St.hashSym](): number {
    return this.cause[St.hashSym]
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    realCause(that)
    realCause(self.cause)
    return that._tag === "Stackless"
      ? self.cause.__equalsSafe(that.cause)
      : self.cause.__equalsSafe(that)
  }
}

export interface Then<E> extends Cause<E> {}
export class Then<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Then";

  readonly [CauseSym]: CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  get [St.hashSym](): number {
    return hashCode(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    return IO.gen(function* (_) {
      realCause(that)
      if (that._tag === "Stackless") {
        return yield* _(self.__equalsSafe(that.cause))
      }
      return (
        (yield* _(self.eq(that))) ||
        (yield* _(sym(associativeThen)(self, that))) ||
        (yield* _(sym(distributiveThen)(self, that))) ||
        (yield* _(sym(zero)(self, that)))
      )
    })
  }

  private eq(that: Cause<unknown>): IO<boolean> {
    const self = this
    realCause(that)
    if (that._tag === "Then") {
      return IO.gen(function* (_) {
        realCause(self.left)
        realCause(self.right)
        return (
          (yield* _(self.left.__equalsSafe(that.left))) &&
          (yield* _(self.right.__equalsSafe(that.right)))
        )
      })
    }
    return IO.succeedNow(false)
  }
}

export interface Both<E> extends Cause<E> {}
export class Both<E> implements St.HasEquals, St.HasHash {
  readonly _tag = "Both";

  readonly [CauseSym]: CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  get [St.hashSym](): number {
    return hashCode(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && this.__equalsSafe(that).run()
  }

  __equalsSafe(that: Cause<unknown>): IO<boolean> {
    const self = this
    return IO.gen(function* (_) {
      realCause(that)
      if (that._tag === "Stackless") {
        return yield* _(self.__equalsSafe(that.cause))
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

  private eq(that: Cause<unknown>): IO<boolean> {
    const self = this
    realCause(that)
    if (that._tag === "Both") {
      return IO.gen(function* (_) {
        realCause(self.left)
        realCause(self.right)
        return (
          (yield* _(self.left.__equalsSafe(that.left))) &&
          (yield* _(self.right.__equalsSafe(that.right)))
        )
      })
    }
    return IO.succeedNow(false)
  }
}
// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/CauseOps empty
 */
export const empty: Cause<never> = new Empty()

/**
 * @tsplus static ets/CauseOps die
 */
export function die(defect: unknown, trace: Trace = none): Cause<never> {
  return new Die(defect, trace)
}

/**
 * @tsplus static ets/CauseOps fail
 */
export function fail<E>(error: E, trace: Trace = none): Cause<E> {
  return new Fail(error, trace)
}

/**
 * @tsplus static ets/CauseOps interrupt
 */
export function interrupt(fiberId: FiberId, trace: Trace = none): Cause<never> {
  return new Interrupt(fiberId, trace)
}

/**
 * @tsplus static ets/CauseOps stack
 */
export function stack<E>(cause: Cause<E>): Cause<E> {
  return new Stackless(cause, false)
}

/**
 * @tsplus static ets/CauseOps stackless
 */
export function stackless<E>(cause: Cause<E>): Cause<E> {
  return new Stackless(cause, true)
}

/**
 * @tsplus operator ets/Cause +
 * @tsplus static ets/CauseOps then
 */
export function combineSeq<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Then<E1 | E2>(left, right)
}

/**
 * @tsplus operator ets/Cause &
 * @tsplus static ets/CauseOps both
 */
export function combinePar<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  // TODO(Mike/Max): discuss this, because ZIO does not flatten empty causes here
  return isEmpty(left) ? right : isEmpty(right) ? left : new Both<E1 | E2>(left, right)
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Determines if the provided value is a `Cause`.
 *
 * @tsplus fluent ets/Cause isCause
 */
export function isCause(self: unknown): self is Cause<unknown> {
  return typeof self === "object" && self != null && CauseSym in self
}

/**
 * Determines if the `Cause` is empty.
 *
 * @tsplus fluent ets/Cause isEmpty
 */
export function isEmpty<E>(cause: Cause<E>): boolean {
  if (isEmptyType(cause) || (isStacklessType(cause) && isEmptyType(cause.cause))) {
    return true
  }
  let causes: Stack<Cause<E>> | undefined = undefined
  realCause(cause)
  let current: RealCause<E> | undefined = cause
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
        realCause(current.left)
        current = current.left
        break
      }
      case "Both": {
        causes = new Stack(current.right, causes)
        realCause(current.left)
        current = current.left
        break
      }
      case "Stackless": {
        realCause(current.cause)
        current = current.cause
        break
      }
      default: {
        current = undefined
      }
    }
    if (!current && causes) {
      realCause(causes.value)
      current = causes.value
      causes = causes.previous
    }
  }
  return true
}

const _emptyHash = St.opt(St.randomInt())

function stepLoop<A>(
  cause: Cause<A>,
  stack: List<Cause<A>>,
  parallel: HashSet<Cause<A>>,
  sequential: List<Cause<A>>
): Tuple<[HashSet<Cause<A>>, List<Cause<A>>]> {
  while (1) {
    realCause(cause)
    switch (cause._tag) {
      case "Empty": {
        if (stack.isEmpty()) {
          return Tuple(parallel, sequential)
        } else {
          cause = stack.unsafeFirst()!
          stack = stack.tail()
        }
        break
      }
      case "Then": {
        const left = cause.left
        const right = cause.right
        realCause(left)
        switch (left._tag) {
          case "Empty": {
            cause = cause.right
            break
          }
          case "Then": {
            cause = new Then(left.left, new Then(left.right, right))
            break
          }
          case "Both": {
            cause = new Both(new Then(left.left, right), new Then(left.right, right))
            break
          }
          case "Stackless": {
            cause = new Then(left.cause, right)
            break
          }
          default: {
            cause = left
            sequential = sequential.prepend(right)
          }
        }
        break
      }
      case "Both": {
        stack = stack.prepend(cause.right)
        cause = cause.left
        break
      }
      case "Stackless": {
        cause = cause.cause
        break
      }
      default: {
        if (stack.isEmpty()) {
          return Tuple(parallel.add(cause), sequential)
        } else {
          parallel = parallel.add(cause)
          cause = stack.unsafeFirst()!
          stack = stack.tail()
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
function step<A>(self: Cause<A>): Tuple<[HashSet<Cause<A>>, List<Cause<A>>]> {
  return stepLoop(self, List.empty(), HashSet(), List.empty())
}

function flattenCauseLoop<A>(
  causes: List<Cause<A>>,
  flattened: List<HashSet<Cause<A>>>
): List<HashSet<Cause<A>>> {
  while (1) {
    const {
      tuple: [parallel, sequential]
    } = causes.reduce(
      Tuple(HashSet<Cause<A>>(), List.empty<Cause<A>>()),
      ({ tuple: [parallel, sequential] }, cause) => {
        const {
          tuple: [set, seq]
        } = step(cause)
        return Tuple(parallel | set, sequential + seq)
      }
    )
    const updated = parallel.size > 0 ? flattened.prepend(parallel) : flattened
    if (sequential.isEmpty()) {
      return updated.reverse()
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
function flattenCause<E>(self: Cause<E>): List<HashSet<Cause<E>>> {
  return flattenCauseLoop(List.single(self), List.empty())
}

function hashCode<E>(self: Cause<E>): number {
  const flat = flattenCause(self)
  const size = flat.size
  let head
  if (size === 0) {
    return _emptyHash
  } else if (size === 1 && (head = flat.unsafeFirst()!) && head.size === 1) {
    return List.from(head).unsafeFirst()![St.hashSym]
  } else {
    return flat[St.hashSym]
  }
}

function sym<E>(
  f: (a: Cause<E>, b: Cause<E>) => IO<boolean>
): (a: Cause<E>, b: Cause<E>) => IO<boolean> {
  return (l, r) => f(l, r).zipWith(f(r, l), (a, b) => a || b)
}

function zero<E>(self: Cause<E>, that: Cause<E>): IO<boolean> {
  if (isThenType(self) && isEmptyType(self.right)) {
    realCause(self.left)
    return self.left.__equalsSafe(that)
  }
  if (isThenType(self) && isEmptyType(self.left)) {
    realCause(self.right)
    return self.right.__equalsSafe(that)
  }
  if (isBothType(self) && isEmptyType(self.right)) {
    realCause(self.left)
    return self.left.__equalsSafe(that)
  }
  if (isBothType(self) && isEmptyType(self.left)) {
    realCause(self.right)
    return self.right.__equalsSafe(that)
  }
  return IO.succeedNow(false)
}

function associativeThen<E>(self: Cause<E>, that: Cause<E>): IO<boolean> {
  return IO.gen(function* (_) {
    if (
      isThenType(self) &&
      isThenType(self.left) &&
      isThenType(that) &&
      isThenType(that.right)
    ) {
      const al = self.left.left
      const bl = self.left.right
      const cl = self.right
      const ar = that.left
      const br = that.right.left
      const cr = that.right.right

      realCause(al)
      realCause(bl)
      realCause(cl)

      return (
        (yield* _(al.__equalsSafe(ar))) &&
        (yield* _(bl.__equalsSafe(br))) &&
        (yield* _(cl.__equalsSafe(cr)))
      )
    }
    return false
  })
}

function distributiveThen<E>(self: Cause<E>, that: Cause<E>): IO<boolean> {
  return IO.gen(function* (_) {
    if (
      isThenType(self) &&
      isBothType(self.right) &&
      isBothType(that) &&
      isThenType(that.left) &&
      isThenType(that.right)
    ) {
      const al = self.left
      const bl = self.right.left
      const cl = self.right.right
      const ar1 = that.left.left
      const br = that.left.right
      const ar2 = that.right.left
      const cr = that.right.right

      realCause(ar1)
      realCause(al)
      realCause(bl)
      realCause(cl)

      if (
        (yield* _(ar1.__equalsSafe(ar2))) &&
        (yield* _(al.__equalsSafe(ar1))) &&
        (yield* _(bl.__equalsSafe(br))) &&
        (yield* _(cl.__equalsSafe(cr)))
      ) {
        return true
      }
    }
    if (
      isThenType(self) &&
      isBothType(self.left) &&
      isBothType(that) &&
      isThenType(that.left) &&
      isThenType(that.right)
    ) {
      const al = self.left.left
      const bl = self.left.right
      const cl = self.right
      const ar = that.left.left
      const cr1 = that.left.right
      const br = that.right.left
      const cr2 = that.right.right

      realCause(cr1)
      realCause(al)
      realCause(bl)
      realCause(cl)

      if (
        (yield* _(cr1.__equalsSafe(cr2))) &&
        (yield* _(al.__equalsSafe(ar))) &&
        (yield* _(bl.__equalsSafe(br))) &&
        (yield* _(cl.__equalsSafe(cr1)))
      ) {
        return true
      }
    }
    return false
  })
}

function associativeBoth<E>(self: Cause<E>, that: Cause<E>): IO<boolean> {
  return IO.gen(function* (_) {
    if (
      isBothType(self) &&
      isBothType(self.left) &&
      isBothType(that) &&
      isBothType(that.right)
    ) {
      const al = self.left.left
      const bl = self.left.right
      const cl = self.right
      const ar = that.left
      const br = that.right.left
      const cr = that.right.right

      realCause(al)
      realCause(bl)
      realCause(cl)

      return (
        (yield* _(al.__equalsSafe(ar))) &&
        (yield* _(bl.__equalsSafe(br))) &&
        (yield* _(cl.__equalsSafe(cr)))
      )
    }
    return false
  })
}

function distributiveBoth<E>(self: Cause<E>, that: Cause<E>): IO<boolean> {
  return IO.gen(function* (_) {
    if (
      isBothType(self) &&
      isThenType(self.left) &&
      isThenType(self.right) &&
      isThenType(that) &&
      isBothType(that.right)
    ) {
      const al1 = self.left.left
      const bl = self.left.right
      const al2 = self.right.left
      const cl = self.right.right
      const ar = that.left
      const br = that.right.left
      const cr = that.right.right

      realCause(al1)
      realCause(bl)
      realCause(cl)

      if (
        (yield* _(al1.__equalsSafe(al2))) &&
        (yield* _(al1.__equalsSafe(ar))) &&
        (yield* _(bl.__equalsSafe(br))) &&
        (yield* _(cl.__equalsSafe(cr)))
      ) {
        return true
      }
    }
    if (
      isBothType(self) &&
      isThenType(self.left) &&
      isThenType(self.right) &&
      isThenType(that) &&
      isBothType(that.left)
    ) {
      const al = self.left.left
      const cl1 = self.left.right
      const bl = self.right.left
      const cl2 = self.right.right
      const ar = that.left.left
      const br = that.left.right
      const cr = that.right

      realCause(cl1)
      realCause(al)
      realCause(bl)

      if (
        (yield* _(cl1.__equalsSafe(cl2))) &&
        (yield* _(al.__equalsSafe(ar))) &&
        (yield* _(bl.__equalsSafe(br))) &&
        (yield* _(cl1.__equalsSafe(cr)))
      ) {
        return true
      }
    }
    return false
  })
}

function commutativeBoth<E>(self: Both<E>, that: Cause<E>): IO<boolean> {
  return IO.gen(function* (_) {
    if (isBothType(that)) {
      realCause(self.left)
      realCause(self.right)
      return (
        (yield* _(self.left.__equalsSafe(that.right))) &&
        (yield* _(self.right.__equalsSafe(that.left)))
      )
    }
    return false
  })
}
