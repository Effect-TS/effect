// ets_tracing: off

import * as A from "../../Collections/Immutable/Array/index.js"
import * as NEA from "../../Collections/Immutable/NonEmptyArray/index.js"
import * as T from "../../Effect/index.js"
import * as E from "../../Either/index.js"
import { flow, identity, pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as ST from "../../Structural/index.js"
import * as PR from "../Primitives/index.js"

export const BoolAlgebraTypeId = Symbol()
export const ValueTypeId = Symbol()
export const AndTypeId = Symbol()
export const OrTypeId = Symbol()
export const NotTypeId = Symbol()

export function concrete<A>(_: BoolAlgebra<A>): asserts _ is typeof _[typeof PR._C] {
  //
}

/**
 * A `BoolAlgebra<A>` is a description of logical operations on values of type
 * `A`.
 */
export abstract class BoolAlgebra<A> implements ST.HasEquals {
  readonly [BoolAlgebraTypeId]: typeof BoolAlgebraTypeId = BoolAlgebraTypeId;
  readonly [PR._A]: () => A;
  readonly [PR._C]: Value<A> | And<A> | Or<A> | Not<A>;

  abstract [ST.equalsSym](that: unknown): boolean

  get [ST.hashSym](): number {
    return fold_(
      this,
      (a) => ST.hash(a),
      (a, b) => a & b,
      (a, b) => a | b,
      (a) => ~a
    )
  }

  ["&&"]<A1>(that: BoolAlgebra<A1>): BoolAlgebra<A | A1> {
    return and_(this, that)
  }

  ["||"]<A1>(that: BoolAlgebra<A1>): BoolAlgebra<A | A1> {
    return or_(this, that)
  }

  get ["!"](): BoolAlgebra<A> {
    return not(this)
  }
}

export class Value<A> extends BoolAlgebra<A> {
  readonly typeId: typeof ValueTypeId = ValueTypeId

  constructor(readonly value: A) {
    super()
  }

  [ST.equalsSym](that: unknown): boolean {
    if (isBoolAlgebra(that)) {
      return this.equal(that) || doubleNegative(this, that)
    }

    return false
  }

  get [ST.hashSym](): number {
    return fold_(
      this,
      (a) => ST.hash(a),
      (a, b) => a & b,
      (a, b) => a | b,
      (a) => ~a
    )
  }

  private equal(that: BoolAlgebra<any>): boolean {
    if (isValue(that)) {
      return ST.equals(this.value, that.value)
    }

    return false
  }
}

export function isValue<A>(a: BoolAlgebra<A>): a is Value<A> {
  concrete(a)

  return a.typeId === ValueTypeId
}

export class And<A> extends BoolAlgebra<A> {
  readonly typeId: typeof AndTypeId = AndTypeId

  constructor(readonly left: BoolAlgebra<A>, readonly right: BoolAlgebra<A>) {
    super()
  }

  [ST.equalsSym](that: unknown): boolean {
    if (isBoolAlgebra(that)) {
      return (
        this.equal(that) ||
        this.commutative(that) ||
        symmetric(And.associative)(this, that) ||
        symmetric(And.distributive)(this, that) ||
        doubleNegative(this, that) ||
        this.deMorgansLaws(that)
      )
    }

    return false
  }

  private equal(that: BoolAlgebra<any>): boolean {
    if (isAnd(that)) {
      return ST.equals(this.left, that.left) && ST.equals(this.right, that.right)
    }

    return false
  }

  private static associative(left: BoolAlgebra<any>, right: BoolAlgebra<any>): boolean {
    if (isAnd(left) && isAnd(right)) {
      if (isAnd(left.left) && isAnd(right.right)) {
        const { left: a1, right: b1 } = left.left
        const c1 = left.right
        const { left: b2, right: c2 } = right.right
        const a2 = right.left

        return ST.equals(a1, a2) && ST.equals(b1, b2) && ST.equals(c1, c2)
      }
    }

    return false
  }

  private commutative(that: BoolAlgebra<any>): boolean {
    if (isAnd(that)) {
      const { left: al, right: bl } = this
      const { left: ar, right: br } = that

      return ST.equals(al, br) && ST.equals(bl, ar)
    }

    return false
  }

  private static distributive(
    left: BoolAlgebra<any>,
    right: BoolAlgebra<any>
  ): boolean {
    if (isAnd(left) && isOr(right)) {
      if (isOr(left.right) && isAnd(right.left) && isAnd(right.right)) {
        const a1 = left.left
        const { left: b1, right: c1 } = left.right
        const { left: a2, right: b2 } = right.left
        const { left: a3, right: c2 } = right.right

        return (
          ST.equals(a1, a2) &&
          ST.equals(a1, a3) &&
          ST.equals(b1, b2) &&
          ST.equals(c1, c2)
        )
      }
    }

    return false
  }

  private deMorgansLaws(that: BoolAlgebra<any>): boolean {
    if (isNot(that)) {
      if (isNot(this.left) && isNot(this.right)) {
        if (isOr(that.result)) {
          const a = this.left.result
          const b = this.right.result
          const { left: c, right: d } = that.result

          return ST.equals(a, c) && ST.equals(b, d)
        }
      }
    }

    return false
  }
}

export function isAnd<A>(a: BoolAlgebra<A>): a is And<A> {
  concrete(a)

  return a.typeId === AndTypeId
}

export class Or<A> extends BoolAlgebra<A> {
  readonly typeId: typeof OrTypeId = OrTypeId

  constructor(readonly left: BoolAlgebra<A>, readonly right: BoolAlgebra<A>) {
    super()
  }

  [ST.equalsSym](that: unknown): boolean {
    if (isBoolAlgebra(that)) {
      return (
        this.equal(that) ||
        this.commutative(that) ||
        symmetric(Or.associative)(this, that) ||
        symmetric(Or.distributive)(this, that) ||
        doubleNegative(this, that) ||
        this.deMorgansLaws(that)
      )
    }

    return false
  }

  private equal(that: BoolAlgebra<any>): boolean {
    if (isOr(that)) {
      return ST.equals(this.left, that.left) && ST.equals(this.right, that.right)
    }

    return false
  }

  private static associative(left: BoolAlgebra<any>, right: BoolAlgebra<any>): boolean {
    if (isOr(left) && isOr(left.left)) {
      if (isOr(right) && isOr(right.right)) {
        const { left: a1, right: b1 } = left.left
        const c1 = left.right
        const a2 = right.left
        const { left: b2, right: c2 } = right.right

        return ST.equals(a1, a2) && ST.equals(b1, b2) && ST.equals(c1, c2)
      }
    }

    return false
  }

  private commutative(that: BoolAlgebra<any>): boolean {
    if (isOr(that)) {
      const { left: al, right: bl } = this
      const { left: ar, right: br } = that

      return ST.equals(al, br) && ST.equals(bl, ar)
    }

    return false
  }

  private static distributive(
    left: BoolAlgebra<any>,
    right: BoolAlgebra<any>
  ): boolean {
    if (isOr(left) && isAnd(left.right)) {
      if (isAnd(right) && isOr(right.left) && isOr(right.right)) {
        const a1 = left.left
        const { left: b1, right: c1 } = left.right
        const { left: a2, right: b2 } = right.left
        const { left: a3, right: c2 } = right.right

        return (
          ST.equals(a1, a2) &&
          ST.equals(a1, a3) &&
          ST.equals(b1, b2) &&
          ST.equals(c1, c2)
        )
      }
    }

    return false
  }

  private deMorgansLaws(that: BoolAlgebra<any>): boolean {
    if (isNot(this.left) && isNot(this.right)) {
      if (isNot(that) && isAnd(that.result)) {
        const a = this.left.result
        const b = this.right.result
        const { left: c, right: d } = that.result

        return ST.equals(a, c) && ST.equals(b, d)
      }
    }

    return false
  }
}

export function isOr<A>(a: BoolAlgebra<A>): a is Or<A> {
  concrete(a)

  return a.typeId === OrTypeId
}

export class Not<A> extends BoolAlgebra<A> {
  readonly typeId: typeof NotTypeId = NotTypeId

  constructor(readonly result: BoolAlgebra<A>) {
    super()
  }

  [ST.equalsSym](that: unknown): boolean {
    if (isBoolAlgebra(that)) {
      return this.equal(that) || doubleNegative(that, this) || this.deMorgansLaws(that)
    }

    return false
  }

  private equal(that: BoolAlgebra<any>): boolean {
    if (isNot(that)) {
      return ST.equals(this.result, that.result)
    }

    return false
  }

  private deMorgansLaws(that: BoolAlgebra<any>): boolean {
    if (isAnd(that)) {
      if (isOr(this.result) && isNot(that.left) && isNot(that.right)) {
        const { left: a, right: b } = this.result
        const c = that.left.result
        const d = that.right.result

        return ST.equals(a, c) && ST.equals(b, d)
      }
    }

    if (isOr(that)) {
      if (isAnd(this.result) && isNot(that.left) && isNot(that.right)) {
        const { left: a, right: b } = this.result
        const c = that.left.result
        const d = that.right.result

        return ST.equals(a, c) && ST.equals(b, d)
      }
    }

    return false
  }
}

export function isNot<A>(a: BoolAlgebra<A>): a is Not<A> {
  concrete(a)

  return a.typeId === NotTypeId
}

export function isBoolAlgebra(a: unknown): a is BoolAlgebra<any> {
  return typeof a === "object" && a !== null && BoolAlgebraTypeId in a
}

function doubleNegative<A>(left: BoolAlgebra<A>, right: BoolAlgebra<A>): boolean {
  if (isNot(right) && isNot(right.result)) {
    return ST.equals(left, right.result.result)
  }

  return false
}

function symmetric<A extends BoolAlgebra<any>>(
  f: (a1: A, a2: A) => boolean
): (a1: A, a2: A) => boolean {
  return (a1, a2) => f(a1, a2) || f(a2, a1)
}

/**
 * Returns a new result, with all values mapped to the specified constant.
 */
export function as_<A, B>(self: BoolAlgebra<A>, b: B): BoolAlgebra<B> {
  return map_(self, (_) => b)
}

/**
 * Returns a new result, with all values mapped to the specified constant.
 */
export function as<B>(b: B) {
  return <A>(self: BoolAlgebra<A>) => as_(self, b)
}

/**
 * If this result is a success returns `None`. If it is a failure returns a
 * new result containing all failures that are relevant to this result being
 * a failure.
 */
export function failures<A>(self: BoolAlgebra<A>): O.Option<BoolAlgebra<A>> {
  return pipe(
    fold_<A, E.Either<BoolAlgebra<A>, BoolAlgebra<A>>>(
      self,
      (a) => E.right(success(a)),
      (l, r) => {
        if (E.isRight(l)) {
          if (E.isRight(r)) {
            return E.right(and_(l.right, r.right))
          } else {
            return E.left(r.left)
          }
        } else {
          if (E.isRight(r)) {
            return E.left(l.left)
          } else {
            return E.left(and_(l.left, r.left))
          }
        }
      },
      (l, r) => {
        if (E.isRight(l)) {
          if (E.isRight(r)) {
            return E.right(or_(l.right, r.right))
          } else {
            return E.right(l.right)
          }
        } else {
          if (E.isRight(r)) {
            return E.right(r.right)
          } else {
            return E.left(or_(l.left, r.left))
          }
        }
      },
      (r) => E.swap(r)
    ),
    E.fold(
      (_) => O.some(_),
      (_) => O.none
    )
  )
}

/**
 * Returns a new result, with all values mapped to new results using the
 * specified function.
 */
export function chain_<A, B>(
  self: BoolAlgebra<A>,
  f: (a: A) => BoolAlgebra<B>
): BoolAlgebra<B> {
  return fold_(self, f, and_, or_, not)
}

/**
 * Returns a new result, with all values mapped to new results using the
 * specified function.
 */
export function chain<A, B>(f: (a: A) => BoolAlgebra<B>) {
  return (self: BoolAlgebra<A>) => chain_(self, f)
}

/**
 * Returns a new result, with all values mapped to new results using the
 * specified effectual function.
 */
export function chainM_<R, E, A, B>(
  self: BoolAlgebra<A>,
  f: (a: A) => T.Effect<R, E, BoolAlgebra<B>>
): T.Effect<R, E, BoolAlgebra<B>> {
  return fold_(
    self,
    f,
    (_) => T.zipWith_(_, _, and_),
    (_) => T.zipWith_(_, _, or_),
    (_) => T.map_(_, not)
  )
}

/**
 * Returns a new result, with all values mapped to new results using the
 * specified effectual function.
 */
export function chainM<R, E, A, B>(f: (a: A) => T.Effect<R, E, BoolAlgebra<B>>) {
  return (self: BoolAlgebra<A>) => chainM_(self, f)
}

/**
 * Folds over the result bottom up, first converting values to `B`
 * values, and then combining the `B` values, using the specified functions.
 */
export function fold_<A, B>(
  self: BoolAlgebra<A>,
  caseValue: (a: A) => B,
  caseAnd: (b1: B, b2: B) => B,
  caseOr: (b1: B, b2: B) => B,
  caseNot: (b: B) => B
): B {
  concrete(self)

  switch (self.typeId) {
    case ValueTypeId:
      return caseValue(self.value)
    case AndTypeId:
      return caseAnd(
        fold_(self.left, caseValue, caseAnd, caseOr, caseNot),
        fold_(self.right, caseValue, caseAnd, caseOr, caseNot)
      )
    case OrTypeId:
      return caseOr(
        fold_(self.left, caseValue, caseAnd, caseOr, caseNot),
        fold_(self.right, caseValue, caseAnd, caseOr, caseNot)
      )
    case NotTypeId:
      return caseNot(fold_(self.result, caseValue, caseAnd, caseOr, caseNot))
  }
}

/**
 * Folds over the result bottom up, first converting values to `B`
 * values, and then combining the `B` values, using the specified functions.
 */
export function fold<A, B>(
  caseValue: (a: A) => B,
  caseAnd: (b1: B, b2: B) => B,
  caseOr: (b1: B, b2: B) => B,
  caseNot: (b: B) => B
) {
  return (self: BoolAlgebra<A>) => fold_(self, caseValue, caseAnd, caseOr, caseNot)
}

export function implies_<A>(
  self: BoolAlgebra<A>,
  that: BoolAlgebra<A>
): BoolAlgebra<A> {
  return or_(not(self), that)
}

export function implies<A>(that: BoolAlgebra<A>) {
  return (self: BoolAlgebra<A>) => implies_(self, that)
}

export function iff_<A>(self: BoolAlgebra<A>, that: BoolAlgebra<A>): BoolAlgebra<A> {
  return and_(implies_(self, that), implies_(that, self))
}

export function iff<A>(that: BoolAlgebra<A>) {
  return (self: BoolAlgebra<A>) => iff_(self, that)
}

/**
 * Determines whether the result is a failure, where values represent success
 * and are combined using logical conjunction, disjunction, and negation.
 */
export function isFailure<A>(self: BoolAlgebra<A>): boolean {
  return !isSuccess(self)
}

/**
 * Determines whether the result is a success, where values represent success
 * and are combined using logical conjunction, disjunction, and negation.
 */
export function isSuccess<A>(self: BoolAlgebra<A>): boolean {
  return fold_(
    self,
    (_): boolean => true,
    (a, b) => a && b,
    (a, b) => a || b,
    (a) => !a
  )
}

/**
 * Returns a new result, with all values mapped by the specified function.
 */
export function map_<A, B>(self: BoolAlgebra<A>, f: (a: A) => B): BoolAlgebra<B> {
  return chain_(self, flow(f, success))
}

/**
 * Returns a new result, with all values mapped by the specified function.
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: BoolAlgebra<A>) => map_(self, f)
}

/**
 * Returns a new result, with all values mapped by the specified effectual
 * function.
 */
export function mapM_<R, E, A, B>(
  self: BoolAlgebra<A>,
  f: (a: A) => T.Effect<R, E, B>
): T.Effect<R, E, BoolAlgebra<B>> {
  return chainM_(self, (a) => T.map_(f(a), success))
}

/**
 * Returns a new result, with all values mapped by the specified effectual
 * function.
 */
export function mapM<R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) {
  return (self: BoolAlgebra<A>) => mapM_(self, f)
}

/**
 * Returns a result that is the logical conjunction of all of the results in
 * the specified collection.
 */
export function all<A>(as: Iterable<BoolAlgebra<A>>): O.Option<BoolAlgebra<A>> {
  const arr = A.from(as)

  if (A.isNonEmpty(arr)) {
    return O.some(A.reduce_(A.drop_(arr, 1), arr[0], and_))
  }

  return O.none
}

/**
 * Constructs a result that is the logical conjunction of two results.
 */
export function and_<A, A1>(
  left: BoolAlgebra<A>,
  right: BoolAlgebra<A1>
): BoolAlgebra<A | A1> {
  return new And<A | A1>(left, right)
}

/**
 * Constructs a result that is the logical conjunction of two results.
 */
export function and<A>(right: BoolAlgebra<A>) {
  return (left: BoolAlgebra<A>) => and_(left, right)
}

/**
 * Returns a result that is the logical disjunction of all of the results in
 * the specified collection.
 */
export function any<A>(as: Iterable<BoolAlgebra<A>>): O.Option<BoolAlgebra<A>> {
  const arr = A.from(as)

  if (A.isNonEmpty(arr)) {
    const [init, ...rest] = arr

    return O.some(A.reduce_(rest, init, or_))
  }

  return O.none
}

/**
 * Combines a collection of results to create a single result that succeeds
 * if all of the results succeed.
 */
export function collectAll<A>(as: Iterable<BoolAlgebra<A>>): O.Option<BoolAlgebra<A>> {
  return forEach(as, identity)
}

/**
 * Constructs a failed result with the specified value.
 */
export function failure<A>(a: A): BoolAlgebra<A> {
  return not(success(a))
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` to produce
 * a collection of results, then combines all of those results to create a
 * single result that is the logical conjunction of all of the results.
 */
export function forEach<A, B>(
  as: Iterable<A>,
  f: (a: A) => BoolAlgebra<B>
): O.Option<BoolAlgebra<B>> {
  const arr = A.from(as)

  if (A.isNonEmpty(arr)) {
    const result = NEA.map_(arr, f)

    return O.some(A.reduce_(NEA.tail(result), NEA.head(result), and_))
  }

  return O.none
}

/**
 * Constructs a result that is the logical negation of the specified result.
 */
export function not<A>(result: BoolAlgebra<A>): BoolAlgebra<A> {
  return new Not(result)
}

/**
 * Constructs a result a that is the logical disjunction of two results.
 */
export function or_<A, A1>(
  left: BoolAlgebra<A>,
  right: BoolAlgebra<A1>
): BoolAlgebra<A | A1> {
  return new Or<A | A1>(left, right)
}

/**
 * Constructs a result a that is the logical disjunction of two results.
 */
export function or<A>(right: BoolAlgebra<A>) {
  return (left: BoolAlgebra<A>) => or_(left, right)
}

/**
 * Constructs a successful result with the specified value.
 */
export function success<A>(a: A): BoolAlgebra<A> {
  return new Value(a)
}

/**
 * A successful result with the unit value.
 */
export const unit: BoolAlgebra<void> = success(undefined)
