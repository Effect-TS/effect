import type * as _pretty from "@effect/core/io/Cause/operations/pretty"
import { Stack } from "@effect/core/support/Stack"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as List from "@fp-ts/data/List"
import * as SafeEval from "@fp-ts/data/SafeEval"

const CauseSymbolKey = "@effect/core/io/Cause"
export const CauseSym = Symbol.for(CauseSymbolKey)
export type CauseSym = typeof CauseSym

export const _E = Symbol.for("@effect/core/io/Cause/E")
export type _E = typeof _E

/**
 * @tsplus type effect/core/io/Cause
 * @category model
 * @since 1.0.0
 */
export interface Cause<E> extends Equal.Equal {
  readonly [CauseSym]: CauseSym
  readonly [_E]: () => E
}

/**
 * @since 1.0.0
 */
export declare namespace Cause {
  export type Renderer = _pretty.Renderer
}

/**
 * @tsplus type effect/core/io/Cause.Ops
 * @category model
 * @since 1.0.0
 */
export interface CauseOps {}
export const Cause: CauseOps = {}

/**
 * @tsplus type effect/core/io/Cause.Aspects
 * @category model
 * @since 1.0.0
 */
export interface CauseAspects {}

/**
 * @tsplus unify effect/core/io/Cause
 */
export function unifyCause<X extends Cause<any>>(
  self: X
): Cause<[X] extends [{ [_E]: () => infer E }] ? E : never> {
  return self
}

/**
 * @category model
 * @since 1.0.0
 */
export type RealCause<E> =
  | Empty
  | Fail<E>
  | Die
  | Interrupt
  | Stackless<E>
  | Then<E>
  | Both<E>

/**
 * @tsplus macro remove
 */
export function realCause<E>(cause: Cause<E>): asserts cause is RealCause<E> {
  //
}

/**
 * @tsplus fluent effect/core/io/Cause isEmptyType
 * @category refinements
 * @since 1.0.0
 */
export function isEmptyType<E>(cause: Cause<E>): cause is Empty {
  realCause(cause)
  return cause._tag === "Empty"
}

/**
 * @tsplus fluent effect/core/io/Cause isDieType
 * @category refinements
 * @since 1.0.0
 */
export function isDieType<E>(cause: Cause<E>): cause is Die {
  realCause(cause)
  return cause._tag === "Die"
}

/**
 * @tsplus fluent effect/core/io/Cause isFailType
 * @category refinements
 * @since 1.0.0
 */
export function isFailType<E>(cause: Cause<E>): cause is Fail<E> {
  realCause(cause)
  return cause._tag === "Fail"
}

/**
 * @tsplus fluent effect/core/io/Cause isInterruptType
 * @category refinements
 * @since 1.0.0
 */
export function isInterruptType<E>(cause: Cause<E>): cause is Interrupt {
  realCause(cause)
  return cause._tag === "Interrupt"
}

/**
 * @tsplus fluent effect/core/io/Cause isStacklessType
 * @category refinements
 * @since 1.0.0
 */
export function isStacklessType<E>(cause: Cause<E>): cause is Stackless<E> {
  realCause(cause)
  return cause._tag === "Stackless"
}

/**
 * @tsplus fluent effect/core/io/Cause isThenType
 * @category refinements
 * @since 1.0.0
 */
export function isThenType<E>(cause: Cause<E>): cause is Then<E> {
  realCause(cause)
  return cause._tag === "Then"
}

/**
 * @tsplus fluent effect/core/io/Cause isBothType
 * @category refinements
 * @since 1.0.0
 */
export function isBothType<E>(cause: Cause<E>): cause is Both<E> {
  realCause(cause)
  return cause._tag === "Both"
}

export class Empty implements Cause<never>, Equal.Equal {
  readonly _tag = "Empty"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => never;

  [Equal.symbolHash](): number {
    return _emptyHash
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    realCause(that)
    switch (that._tag) {
      case "Empty": {
        return SafeEval.succeed(true)
      }
      case "Both":
      case "Then": {
        return pipe(
          SafeEval.suspend(() => this.__equalsSafe(that.left)),
          SafeEval.zipWith(
            SafeEval.suspend(() => this.__equalsSafe(that.right)),
            (a, b) => a && b
          )
        )
      }
      case "Stackless": {
        return SafeEval.suspend(() => this.__equalsSafe(that.cause))
      }
      default: {
        return SafeEval.succeed(false)
      }
    }
  }
}

export interface Fail<E> extends Cause<E> {}
export class Fail<E> implements Cause<E>, Equal.Equal {
  readonly _tag = "Fail"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => E

  constructor(readonly value: E) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    realCause(that)
    switch (that._tag) {
      case "Fail": {
        return SafeEval.succeed(Equal.equals(this.value, that.value))
      }
      case "Both":
      case "Then": {
        return SafeEval.suspend(() => sym(zero)(this, that))
      }
      case "Stackless": {
        return SafeEval.suspend(() => this.__equalsSafe(that.cause))
      }
      default: {
        return SafeEval.succeed(false)
      }
    }
  }
}

export class Die implements Cause<never>, Equal.Equal {
  readonly _tag = "Die"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => never

  constructor(readonly value: unknown) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    realCause(that)
    switch (that._tag) {
      case "Die": {
        return SafeEval.succeed(Equal.equals(this.value, that.value))
      }
      case "Both":
      case "Then": {
        return SafeEval.suspend(() => sym(zero)(this, that))
      }
      case "Stackless": {
        return SafeEval.suspend(() => this.__equalsSafe(that.cause))
      }
      default: {
        return SafeEval.succeed(false)
      }
    }
  }
}

export class Interrupt implements Cause<never>, Equal.Equal {
  readonly _tag = "Interrupt"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => never

  constructor(readonly fiberId: FiberId) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.fiberId))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    realCause(that)
    switch (that._tag) {
      case "Interrupt": {
        return SafeEval.succeed(Equal.equals(this.fiberId, that.fiberId))
      }
      case "Both":
      case "Then": {
        return SafeEval.suspend(() => sym(zero)(this, that))
      }
      case "Stackless": {
        return SafeEval.suspend(() => this.__equalsSafe(that.cause))
      }
      default: {
        return SafeEval.succeed(false)
      }
    }
  }
}

export class Stackless<E> implements Cause<E>, Equal.Equal {
  readonly _tag = "Stackless"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => E

  constructor(readonly cause: Cause<E>, readonly stackless: boolean) {}

  [Equal.symbolHash](): number {
    return this.cause[Equal.symbolHash]()
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    realCause(this.cause)
    realCause(that)
    return that._tag === "Stackless"
      ? this.cause.__equalsSafe(that.cause)
      : this.cause.__equalsSafe(that)
  }
}

export class Then<E> implements Cause<E>, Equal.Equal {
  readonly _tag = "Then"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => E

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  [Equal.symbolHash](): number {
    return hashCode(this)
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return SafeEval.gen(function*(_) {
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

  private eq(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    realCause(that)
    if (that._tag === "Then") {
      return SafeEval.gen(function*(_) {
        realCause(self.left)
        realCause(self.right)
        return (
          (yield* _(self.left.__equalsSafe(that.left))) &&
          (yield* _(self.right.__equalsSafe(that.right)))
        )
      })
    }
    return SafeEval.succeed(false)
  }
}

export class Both<E> implements Cause<E>, Equal.Equal {
  readonly _tag = "Both"

  readonly [CauseSym]: CauseSym = CauseSym
  readonly [_E]!: () => E

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  [Equal.symbolHash](): number {
    return hashCode(this)
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isCause(that) && SafeEval.execute(this.__equalsSafe(that))
  }

  __equalsSafe(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return SafeEval.gen(function*(_) {
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

  private eq(that: Cause<unknown>): SafeEval.SafeEval<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    realCause(that)
    if (that._tag === "Both") {
      return SafeEval.gen(function*(_) {
        realCause(self.left)
        realCause(self.right)
        return (
          (yield* _(self.left.__equalsSafe(that.left))) &&
          (yield* _(self.right.__equalsSafe(that.right)))
        )
      })
    }
    return SafeEval.succeed(false)
  }
}
// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static effect/core/io/Cause.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export const empty: Cause<never> = new Empty()

/**
 * @tsplus static effect/core/io/Cause.Ops die
 * @category constructors
 * @since 1.0.0
 */
export function die(defect: unknown): Cause<never> {
  return new Die(defect)
}

/**
 * @tsplus static effect/core/io/Cause.Ops fail
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(error: E): Cause<E> {
  return new Fail(error)
}

/**
 * @tsplus static effect/core/io/Cause.Ops interrupt
 * @category constructors
 * @since 1.0.0
 */
export function interrupt(fiberId: FiberId): Cause<never> {
  return new Interrupt(fiberId)
}

/**
 * @tsplus static effect/core/io/Cause.Ops stack
 * @category constructors
 * @since 1.0.0
 */
export function stack<E>(cause: Cause<E>): Cause<E> {
  return new Stackless(cause, false)
}

/**
 * @tsplus static effect/core/io/Cause.Ops stackless
 * @category constructors
 * @since 1.0.0
 */
export function stackless<E>(cause: Cause<E>): Cause<E> {
  return new Stackless(cause, true)
}

/**
 * @tsplus operator effect/core/io/Cause +
 * @tsplus static effect/core/io/Cause.Ops then
 * @category constructors
 * @since 1.0.0
 */
export function combineSeq<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ?
    right :
    isEmpty(right) ?
    left :
    Equal.equals(left, right) ?
    left :
    new Then<E1 | E2>(left, right)
}

/**
 * @tsplus operator effect/core/io/Cause &
 * @tsplus static effect/core/io/Cause.Ops both
 * @category constructors
 * @since 1.0.0
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
 * @tsplus fluent effect/core/io/Cause isCause
 * @category refinements
 * @since 1.0.0
 */
export function isCause(self: unknown): self is Cause<unknown> {
  return typeof self === "object" && self != null && CauseSym in self
}

/**
 * Determines if the `Cause` is empty.
 *
 * @tsplus getter effect/core/io/Cause isEmpty
 * @category destructors
 * @since 1.0.0
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

const _emptyHash = Equal.hashOptimize(Equal.hashRandom({ CauseSymbolKey }))

function stepLoop<A>(
  cause: Cause<A>,
  stack: List.List<Cause<A>>,
  parallel: HashSet.HashSet<Cause<A>>,
  sequential: List.List<Cause<A>>
): readonly [HashSet.HashSet<Cause<A>>, List.List<Cause<A>>] {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    realCause(cause)
    switch (cause._tag) {
      case "Empty": {
        if (List.isNil(stack)) {
          return [parallel, sequential] as const
        } else {
          cause = stack.head
          stack = stack.tail == null ? List.nil() : stack.tail
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
            sequential = pipe(sequential, List.prepend(right))
          }
        }
        break
      }
      case "Both": {
        stack = pipe(stack, List.prepend(cause.right))
        cause = cause.left
        break
      }
      case "Stackless": {
        cause = cause.cause
        break
      }
      default: {
        if (List.isNil(stack)) {
          return [pipe(parallel, HashSet.add<Cause<A>>(cause)), sequential] as const
        } else {
          parallel = pipe(parallel, HashSet.add<Cause<A>>(cause))
          cause = stack.head
          stack = stack.tail == null ? List.nil() : stack.tail
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
function step<A>(self: Cause<A>): readonly [HashSet.HashSet<Cause<A>>, List.List<Cause<A>>] {
  return stepLoop(self, List.empty(), HashSet.empty(), List.empty())
}

function flattenCauseLoop<A>(
  causes: List.List<Cause<A>>,
  flattened: List.List<HashSet.HashSet<Cause<A>>>
): List.List<HashSet.HashSet<Cause<A>>> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = pipe(
      causes,
      List.reduce(
        [HashSet.empty<Cause<A>>(), List.empty<Cause<A>>()] as const,
        ([parallel, sequential], cause) => {
          const [set, seq] = step(cause)
          return [pipe(parallel, HashSet.union(set)), pipe(sequential, List.concat(seq))]
        }
      )
    )
    const updated = HashSet.size(parallel) > 0 ? pipe(flattened, List.prepend(parallel)) : flattened
    if (List.isNil(sequential)) {
      return List.reverse(updated)
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
function flattenCause<E>(self: Cause<E>): List.List<HashSet.HashSet<Cause<E>>> {
  return flattenCauseLoop(List.of(self), List.empty())
}

function hashCode<E>(self: Cause<E>): number {
  const flat = flattenCause(self)
  let head: HashSet.HashSet<unknown>
  if (List.isNil(flat)) {
    return _emptyHash
  } else if (List.isNil(flat.tail) && (head = flat.head) && HashSet.size(head)) {
    return List.cons(head, List.nil()).head[Equal.symbolHash]()
  } else {
    return flat[Equal.symbolHash]()
  }
}

function sym<E>(
  f: (a: Cause<E>, b: Cause<E>) => SafeEval.SafeEval<boolean>
): (a: Cause<E>, b: Cause<E>) => SafeEval.SafeEval<boolean> {
  return (l, r) => pipe(f(l, r), SafeEval.zipWith(f(r, l), (a, b) => a || b))
}

function zero<E>(self: Cause<E>, that: Cause<E>): SafeEval.SafeEval<boolean> {
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
  return SafeEval.succeed(false)
}

function associativeThen<E>(self: Cause<E>, that: Cause<E>): SafeEval.SafeEval<boolean> {
  return SafeEval.gen(function*(_) {
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

function distributiveThen<E>(self: Cause<E>, that: Cause<E>): SafeEval.SafeEval<boolean> {
  return SafeEval.gen(function*(_) {
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

function associativeBoth<E>(self: Cause<E>, that: Cause<E>): SafeEval.SafeEval<boolean> {
  return SafeEval.gen(function*(_) {
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

function distributiveBoth<E>(self: Cause<E>, that: Cause<E>): SafeEval.SafeEval<boolean> {
  return SafeEval.gen(function*(_) {
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

function commutativeBoth<E>(self: Both<E>, that: Cause<E>): SafeEval.SafeEval<boolean> {
  return SafeEval.gen(function*(_) {
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
