// tracing: off

import "../../Operator"

import * as St from "../../Structural"

export class OneShot<A> implements St.HasEquals, St.HasHash {
  private internal: A | undefined = undefined

  set(a: A) {
    if (this.internal) {
      throw new Error("OneShot already set")
    }
    if (a == null) {
      throw new Error("Cannot set null to OneShot")
    }
    this.internal = a
  }

  get() {
    if (this.internal) {
      return this.internal
    }
    throw new Error("Value not set in OneShot")
  }

  isSet() {
    return this.internal != null
  }

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }
}
