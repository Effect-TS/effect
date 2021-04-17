// tracing: off

import * as L from "../Collections/Immutable/List/core"
import type { FiberID } from "../Fiber/id"
import type { Trace } from "../Fiber/tracing"
import * as IO from "../IO"
import * as O from "../Option"
import { Stack } from "../Stack"
import * as St from "../Structural"

/**
 * Cause is a Free Semiring structure that allows tracking of multiple error causes.
 */
export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E> | Traced<E>

export const CauseSym = Symbol()

export function isCause(self: unknown): self is Cause<unknown> {
  return typeof self === "object" && self != null && CauseSym in self
}

export class Empty {
  readonly _tag = "Empty";
  readonly [CauseSym]: typeof CauseSym = CauseSym;

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      if (that._tag === "Empty") {
        return true
      } else if (that._tag === "Then") {
        return (
          (yield* _(self.equalsM(that.left))) && (yield* _(self.equalsM(that.right)))
        )
      } else if (that._tag === "Both") {
        return (
          (yield* _(self.equalsM(that.left))) && (yield* _(self.equalsM(that.right)))
        )
      } else {
        return false
      }
    })
  }
}

export class Fail<E> {
  readonly _tag = "Fail";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly value: E) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Fail": {
          return St.equals(self.value, that.value)
        }
        case "Then": {
          return yield* _(symM(emptyM)(self, that))
        }
        case "Both": {
          return yield* _(symM(emptyM)(self, that))
        }
        case "Traced": {
          return yield* _(self.equalsM(that.cause))
        }
      }
      return false
    })
  }
}

export class Die {
  readonly _tag = "Die";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly value: unknown) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Die": {
          return St.equals(self.value, that.value)
        }
        case "Then": {
          return yield* _(symM(emptyM)(self, that))
        }
        case "Both": {
          return yield* _(symM(emptyM)(self, that))
        }
        case "Traced": {
          return yield* _(self.equalsM(that.cause))
        }
      }
      return false
    })
  }
}

export class Interrupt {
  readonly _tag = "Interrupt";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly fiberId: FiberID) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Interrupt": {
          return (
            self.fiberId.seqNumber === that.fiberId.seqNumber &&
            self.fiberId.startTimeMillis === that.fiberId.startTimeMillis
          )
        }
        case "Then": {
          return yield* _(symM(emptyM)(self, that))
        }
        case "Both": {
          return yield* _(symM(emptyM)(self, that))
        }
        case "Traced": {
          return yield* _(self.equalsM(that.cause))
        }
      }
      return false
    })
  }
}

export class Traced<E> {
  readonly _tag = "Traced";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly cause: Cause<E>, readonly trace: Trace) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self: Traced<E> = this
    return IO.gen(function* (_) {
      if (that._tag === "Traced") {
        return yield* _(self.cause.equalsM(that.cause))
      }
      return yield* _(self.cause.equalsM(that))
    })
  }
}

export class Then<E> {
  readonly _tag = "Then";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Traced": {
          return yield* _(self.equalsM(that.cause))
        }
      }
      return (
        (yield* _(equalsThenEqM(self, that))) ||
        (yield* _(symM(equalsThenAssocM)(self, that))) ||
        (yield* _(symM(equalsThenDistM)(self, that))) ||
        (yield* _(symM(emptyM)(self, that)))
      )
    })
  }
}

export class Both<E> {
  readonly _tag = "Both";
  readonly [CauseSym]: typeof CauseSym = CauseSym

  constructor(readonly left: Cause<E>, readonly right: Cause<E>) {}

  [St.equalsSym](that: unknown): boolean {
    return isCause(that) && equals(this, that)
  }

  equalsM(that: Cause<unknown>): IO.IO<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return IO.gen(function* (_) {
      switch (that._tag) {
        case "Traced": {
          return yield* _(self.equalsM(that.cause))
        }
      }
      return (
        (yield* _(equalsBothEqM(self, that))) ||
        (yield* _(symM(equalsBothAssocM)(self, that))) ||
        (yield* _(symM(equalsBothDistM)(self, that))) ||
        (yield* _(equalsBothCommM(self, that))) ||
        (yield* _(symM(emptyM)(self, that)))
      )
    })
  }
}

export const empty: Cause<never> = new Empty()

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

export function then<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
  return isEmpty(left) ? right : isEmpty(right) ? left : new Then<E1 | E2>(left, right)
}

export function both<E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> {
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

function equalsThenEqM<A>(self: Then<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Then": {
        return (
          (yield* _(self.left.equalsM(that.left))) ||
          (yield* _(self.right.equalsM(that.right)))
        )
      }
    }
    return false
  })
}

function equalsThenAssocM<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
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
        (yield* _(al.equalsM(ar))) &&
        (yield* _(bl.equalsM(br))) &&
        (yield* _(cl.equalsM(cr)))
      )
    }
    return false
  })
}

function equalsThenDistM<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
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
        (yield* _(ar1.equalsM(ar2))) &&
        (yield* _(al.equalsM(ar1))) &&
        (yield* _(bl.equalsM(br))) &&
        (yield* _(cl.equalsM(cr)))
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
        (yield* _(cr1.equalsM(cr2))) &&
        (yield* _(al.equalsM(ar))) &&
        (yield* _(bl.equalsM(br))) &&
        (yield* _(cl.equalsM(cr1)))
      ) {
        return true
      }
    }
    return false
  })
}

function equalsBothEqM<A>(self: Both<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Both": {
        return (
          (yield* _(self.left.equalsM(that.left))) ||
          (yield* _(self.right.equalsM(that.right)))
        )
      }
    }
    return false
  })
}

function equalsBothAssocM<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
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
        (yield* _(al.equalsM(ar))) &&
        (yield* _(bl.equalsM(br))) &&
        (yield* _(cl.equalsM(cr)))
      )
    }
    return false
  })
}

function equalsBothDistM<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
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
        (yield* _(al1.equalsM(al2))) &&
        (yield* _(al1.equalsM(ar))) &&
        (yield* _(bl.equalsM(br))) &&
        (yield* _(cl.equalsM(cr)))
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
        (yield* _(cl1.equalsM(cl2))) &&
        (yield* _(al.equalsM(ar))) &&
        (yield* _(bl.equalsM(br))) &&
        (yield* _(cl1.equalsM(cr)))
      ) {
        return true
      }
    }
    return false
  })
}

function equalsBothCommM<A>(self: Both<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (that._tag === "Both") {
      return (
        (yield* _(self.left.equalsM(that.right))) ||
        (yield* _(self.right.equalsM(that.left)))
      )
    }
    return false
  })
}

function emptyM<A>(self: Cause<A>, that: Cause<A>) {
  if (self._tag === "Then" && self.right._tag === "Empty") {
    return self.left.equalsM(that)
  }
  if (self._tag === "Then" && self.left._tag === "Empty") {
    return self.right.equalsM(that)
  }
  if (self._tag === "Both" && self.right._tag === "Empty") {
    return self.left.equalsM(that)
  }
  if (self._tag === "Both" && self.left._tag === "Empty") {
    return self.right.equalsM(that)
  }
  return IO.succeed(false)
}

function symM<A>(
  f: (a: Cause<A>, b: Cause<A>) => IO.IO<boolean>
): (a: Cause<A>, b: Cause<A>) => IO.IO<boolean> {
  return (l, r) =>
    IO.gen(function* (_) {
      return (yield* _(f(l, r))) || (yield* _(f(r, l)))
    })
}

export function equals<A>(self: Cause<A>, that: Cause<A>): boolean {
  return IO.run(self.equalsM(that))
}
