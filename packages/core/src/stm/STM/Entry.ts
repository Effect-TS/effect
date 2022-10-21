import { Versioned } from "@effect/core/stm/STM/Versioned"
import { concreteTRef } from "@effect/core/stm/TRef/operations/_internal/TRefInternal"

export const EntrySym = Symbol.for("@effect/core/stm/STM/Entry")
export type EntrySym = typeof EntrySym

/**
 * @tsplus type effect/core/stm/STM/Entry
 * @tsplus companion effect/core/stm/STM/Entry.Ops
 */
export class Entry {
  readonly [EntrySym]: EntrySym = EntrySym

  constructor(readonly use: <X>(f: <S>(entry: EntryOps<S>) => X) => X) {}
}

/**
 * @tsplus static effect/core/stm/STM/Entry.Ops __call
 */
export function makeEntry<A0>(tref0: TRef<A0>, isNew0: boolean): Entry {
  concreteTRef(tref0)
  const versioned = tref0.versioned
  const ops = new EntryOps<A0>(tref0, versioned, versioned.value, isNew0, false)
  return new Entry((f) => f(ops))
}

export const EntryOpsSym = Symbol.for("@effect/core/stm/STM/Entry/Ops")
export type EntryOpsSym = typeof EntryOpsSym

export class EntryOps<S> {
  readonly [EntryOpsSym]: EntryOpsSym = EntryOpsSym

  readonly tref: TRef<S>
  readonly expected: Versioned<S>
  newValue: S
  readonly isNew: boolean
  _isChanged: boolean

  constructor(
    tref: TRef<S>,
    expected: Versioned<S>,
    newValue: S,
    isNew: boolean,
    isChanged: boolean
  ) {
    this.tref = tref
    this.expected = expected
    this.newValue = newValue
    this.isNew = isNew
    this._isChanged = isChanged
  }

  unsafeSet(value: unknown) {
    this._isChanged = true
    this.newValue = value as S
  }

  unsafeGet<B>(): B {
    return this.newValue as unknown as B
  }

  commit() {
    concreteTRef(this.tref)
    this.tref.versioned = Versioned(this.newValue)
  }

  copy(): Entry {
    const ops = new EntryOps<S>(
      this.tref,
      this.expected,
      this.newValue,
      this.isNew,
      this.isChanged()
    )
    return new Entry((f) => f(ops))
  }

  isInvalid() {
    return !this.isValid()
  }

  isValid() {
    concreteTRef(this.tref)
    return this.tref.versioned === this.expected
  }

  isChanged() {
    return this._isChanged
  }

  toString() {
    return `Entry(expected.value = ${this.expected.value}, newValue = ${this.newValue}, tref = ${this.tref}, isChanged = ${this.isChanged()})`
  }
}
