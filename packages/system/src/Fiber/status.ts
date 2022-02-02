// ets_tracing: off

import * as St from "../Structural/index.js"
import * as S from "../Sync/index.js"
import type { FiberID } from "./id.js"

export type Status = Done | Finishing | Running | Suspended

export class Done implements St.HasEquals {
  readonly _tag = "Done"

  get [St.hashSym](): number {
    return St.hashString(this._tag)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Done
  }
}

export class Finishing {
  readonly _tag = "Finishing"

  constructor(readonly interrupting: boolean) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.interrupting))
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Finishing && this.interrupting === that.interrupting
  }
}

export class Running {
  readonly _tag = "Running"

  constructor(readonly interrupting: boolean) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hash(this.interrupting))
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Running && this.interrupting === that.interrupting
  }
}

export class Suspended {
  readonly _tag = "Suspended"

  constructor(
    readonly previous: Status,
    readonly interruptible: boolean,
    readonly epoch: number,
    readonly blockingOn: readonly FiberID[]
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.combineHash(
        St.hashString(this._tag),
        St.hashPlainObject({
          previous: this.previous,
          interruptible: this.interruptible,
          epoch: this.epoch
        })
      ),
      St.hashArray(this.blockingOn)
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      that instanceof Suspended &&
      St.equals(this.previous, that.previous) &&
      this.interruptible === that.interruptible &&
      this.epoch === that.epoch &&
      this.eqArr(this.blockingOn, that.blockingOn)
    )
  }

  eqArr(a: readonly FiberID[], b: readonly FiberID[]): boolean {
    if (a.length !== b.length) {
      return false
    }
    return a.every((v, i) => St.equals(v, b[i]))
  }
}

export function isDone(s: Status): boolean {
  return s._tag === "Done"
}

export function withInterruptingSafe(b: boolean) {
  return (s: Status): S.UIO<Status> => {
    return S.gen(function* (_) {
      switch (s._tag) {
        case "Done": {
          return s
        }
        case "Finishing": {
          return new Finishing(b)
        }
        case "Running": {
          return new Running(b)
        }
        case "Suspended": {
          return new Suspended(
            yield* _(withInterruptingSafe(b)(s.previous)),
            s.interruptible,
            s.epoch,
            s.blockingOn
          )
        }
      }
    })
  }
}

export function withInterrupting(b: boolean) {
  return (s: Status) => S.run(withInterruptingSafe(b)(s))
}

export function toFinishing(s: Status): Status {
  return S.run(toFinishingSafe(s))
}

export function toFinishingSafe(s: Status): S.UIO<Status> {
  return S.gen(function* (_) {
    switch (s._tag) {
      case "Done": {
        return s
      }
      case "Finishing": {
        return s
      }
      case "Running": {
        return s
      }
      case "Suspended": {
        return yield* _(toFinishingSafe(s.previous))
      }
    }
  })
}
