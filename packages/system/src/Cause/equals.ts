import * as IO from "../IO"
import type { Both, Cause, Die, Empty, Fail, Interrupt, Then, Traced } from "./cause"

function equalsEmptyM<A>(self: Empty, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (that._tag === "Empty") {
      return true
    } else if (that._tag === "Then") {
      return (
        (yield* _(equalsM(self, that.left))) && (yield* _(equalsM(self, that.right)))
      )
    } else if (that._tag === "Both") {
      return (
        (yield* _(equalsM(self, that.left))) && (yield* _(equalsM(self, that.right)))
      )
    } else {
      return false
    }
  })
}

function equalsTracedM<A>(self: Traced<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    if (that._tag === "Traced") {
      return yield* _(equalsM(self.cause, that.cause))
    }
    return yield* _(equalsM(self.cause, that))
  })
}

function equalsInterruptM<A>(self: Interrupt, that: Cause<A>): IO.IO<boolean> {
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
        return yield* _(equalsInterruptM(self, that.cause))
      }
    }
    return false
  })
}

function equalsFailM<A>(self: Fail<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Fail": {
        return self.value === that.value
      }
      case "Then": {
        return yield* _(symM(emptyM)(self, that))
      }
      case "Both": {
        return yield* _(symM(emptyM)(self, that))
      }
      case "Traced": {
        return yield* _(equalsFailM(self, that.cause))
      }
    }
    return false
  })
}

function equalsDieM<A>(self: Die, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Die": {
        return self.value === that.value
      }
      case "Then": {
        return yield* _(symM(emptyM)(self, that))
      }
      case "Both": {
        return yield* _(symM(emptyM)(self, that))
      }
      case "Traced": {
        return yield* _(equalsDieM(self, that.cause))
      }
    }
    return false
  })
}

function equalsThenM<A>(self: Then<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Traced": {
        return yield* _(equalsThenM(self, that.cause))
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

function equalsThenEqM<A>(self: Then<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Then": {
        return (
          (yield* _(equalsM(self.left, that.left))) ||
          (yield* _(equalsM(self.right, that.right)))
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
        (yield* _(equalsM(al, ar))) &&
        (yield* _(equalsM(bl, br))) &&
        (yield* _(equalsM(cl, cr)))
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
        (yield* _(equalsM(ar1, ar2))) &&
        (yield* _(equalsM(al, ar1))) &&
        (yield* _(equalsM(bl, br))) &&
        (yield* _(equalsM(cl, cr)))
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
        (yield* _(equalsM(cr1, cr2))) &&
        (yield* _(equalsM(al, ar))) &&
        (yield* _(equalsM(bl, br))) &&
        (yield* _(equalsM(cl, cr1)))
      ) {
        return true
      }
    }
    return false
  })
}

function equalsBothM<A>(self: Both<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Traced": {
        return yield* _(equalsBothM(self, that.cause))
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

function equalsBothEqM<A>(self: Both<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (that._tag) {
      case "Both": {
        return (
          (yield* _(equalsM(self.left, that.left))) ||
          (yield* _(equalsM(self.right, that.right)))
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
        (yield* _(equalsM(al, ar))) &&
        (yield* _(equalsM(bl, br))) &&
        (yield* _(equalsM(cl, cr)))
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
        (yield* _(equalsM(al1, al2))) &&
        (yield* _(equalsM(al1, ar))) &&
        (yield* _(equalsM(bl, br))) &&
        (yield* _(equalsM(cl, cr)))
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
        (yield* _(equalsM(cl1, cl2))) &&
        (yield* _(equalsM(al, ar))) &&
        (yield* _(equalsM(bl, br))) &&
        (yield* _(equalsM(cl1, cr)))
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
        (yield* _(equalsM(self.left, that.right))) ||
        (yield* _(equalsM(self.right, that.left)))
      )
    }
    return false
  })
}

function emptyM<A>(self: Cause<A>, that: Cause<A>) {
  if (self._tag === "Then" && self.right._tag === "Empty") {
    return equalsM(self.left, that)
  }
  if (self._tag === "Then" && self.left._tag === "Empty") {
    return equalsM(self.right, that)
  }
  if (self._tag === "Both" && self.right._tag === "Empty") {
    return equalsM(self.left, that)
  }
  if (self._tag === "Both" && self.left._tag === "Empty") {
    return equalsM(self.right, that)
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

export function equalsM<A>(self: Cause<A>, that: Cause<A>): IO.IO<boolean> {
  return IO.gen(function* (_) {
    switch (self._tag) {
      case "Traced": {
        return yield* _(equalsTracedM(self, that))
      }
      case "Empty": {
        return yield* _(equalsEmptyM(self, that))
      }
      case "Interrupt": {
        return yield* _(equalsInterruptM(self, that))
      }
      case "Fail": {
        return yield* _(equalsFailM(self, that))
      }
      case "Die": {
        return yield* _(equalsDieM(self, that))
      }
      case "Then": {
        return yield* _(equalsThenM(self, that))
      }
      case "Both": {
        return yield* _(equalsBothM(self, that))
      }
    }
  })
}

export function equals<A>(self: Cause<A>, that: Cause<A>): boolean {
  return IO.run(equalsM(self, that))
}
