// ets_tracing: off

import "../../../Operator/index.js"

import type { Atomic } from "../../TRef/index.js"
import { Versioned } from "../Versioned/index.js"

export const EntryTypeId = Symbol()
export type EntryTypeId = typeof EntryTypeId

export class Entry {
  readonly _typeId: EntryTypeId = EntryTypeId

  constructor(readonly use: <X>(f: <S>(entry: EntryOps<S>) => X) => X) {}
}

export function makeEntry<A0>(tref0: Atomic<A0>, isNew0: boolean): Entry {
  const versioned = tref0.versioned
  const ops = new EntryOps<A0>(tref0, versioned, versioned.value, isNew0, false)
  return new Entry((f) => f(ops))
}

export const EntryOpsTypeId = Symbol()
export type EntryOpsTypeId = typeof EntryOpsTypeId

export class EntryOps<S> {
  readonly _typeId: EntryOpsTypeId = EntryOpsTypeId

  readonly tref: Atomic<S>
  readonly expected: Versioned<S>
  newValue: S
  readonly isNew: boolean
  _isChanged: boolean

  constructor(
    tref: Atomic<S>,
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
    this.tref.versioned = new Versioned(this.newValue)
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
    return this.tref.versioned === this.expected
  }

  isChanged() {
    return this._isChanged
  }

  toString() {
    return `Entry(expected.value = ${this.expected.value}, newValue = ${
      this.newValue
    }, tref = ${this.tref}, isChanged = ${this.isChanged()})`
  }
}
