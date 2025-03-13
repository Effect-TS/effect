/**
 * @since 0.24.0
 */
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * `boolean` semigroup under conjunction.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupEvery } from "@effect/typeclass/data/Boolean"
 *
 * console.log(SemigroupEvery.combine(true, true))
 * // true
 * console.log(SemigroupEvery.combine(true, false))
 * // false
 * console.log(SemigroupEvery.combine(false, true))
 * // false
 * console.log(SemigroupEvery.combine(false, false))
 * // false
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupEvery: semigroup.Semigroup<boolean> = semigroup.make(
  (self, that) => self && that,
  (self, collection) => {
    if (self === false) {
      return false
    }
    for (const b of collection) {
      if (b === false) {
        return false
      }
    }
    return true
  }
)

/**
 * `boolean` semigroup under disjunction.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupSome } from "@effect/typeclass/data/Boolean"
 *
 * console.log(SemigroupSome.combine(true, true))
 * // true
 * console.log(SemigroupSome.combine(true, false))
 * // true
 * console.log(SemigroupSome.combine(false, true))
 * // true
 * console.log(SemigroupSome.combine(false, false))
 * // false
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupSome: semigroup.Semigroup<boolean> = semigroup.make(
  (self, that) => self || that,
  (self, collection) => {
    if (self === true) {
      return true
    }
    for (const b of collection) {
      if (b === true) {
        return true
      }
    }
    return false
  }
)

/**
 * `boolean` semigroup under exclusive disjunction.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupXor } from "@effect/typeclass/data/Boolean"
 *
 * console.log(SemigroupXor.combine(true, true))
 * // false
 * console.log(SemigroupXor.combine(true, false))
 * // true
 * console.log(SemigroupXor.combine(false, true))
 * // true
 * console.log(SemigroupXor.combine(false, false))
 * // false
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupXor: semigroup.Semigroup<boolean> = semigroup.make((self, that) => self !== that)

/**
 * `boolean` semigroup under equivalence.
 *
 * **Example**
 *
 * ```ts
 * import { SemigroupEqv } from "@effect/typeclass/data/Boolean"
 *
 * console.log(SemigroupEqv.combine(true, true))
 * // true
 * console.log(SemigroupEqv.combine(true, false))
 * // false
 * console.log(SemigroupEqv.combine(false, true))
 * // false
 * console.log(SemigroupEqv.combine(false, false))
 * // true
 * ```
 *
 * @category instances
 * @since 0.24.0
 */
export const SemigroupEqv: semigroup.Semigroup<boolean> = semigroup.make((self, that) => self === that)

/**
 * `boolean` monoid under conjunction, see also {@link SemigroupEvery}.
 *
 * The `empty` value is `true`.
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidEvery: monoid.Monoid<boolean> = monoid.fromSemigroup(SemigroupEvery, true)

/**
 * `boolean` monoid under disjunction, see also {@link SemigroupSome}.
 *
 * The `empty` value is `false`.
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidSome: monoid.Monoid<boolean> = monoid.fromSemigroup(SemigroupSome, false)

/**
 * `boolean` monoid under exclusive disjunction, see also {@link SemigroupXor}.
 *
 * The `empty` value is `false`.
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidXor: monoid.Monoid<boolean> = monoid.fromSemigroup(SemigroupXor, false)

/**
 * `boolean` monoid under equivalence.
 *
 * The `empty` value is `true`.
 *
 * @category instances
 * @since 0.24.0
 */
export const MonoidEqv: monoid.Monoid<boolean> = monoid.fromSemigroup(SemigroupEqv, true)
