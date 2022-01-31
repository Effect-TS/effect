import { IO } from "../../io-light/IO"
import * as St from "../../prelude/Structural"
import type * as FiberId from "../FiberId"
import type { TraceElement } from "../TraceElement"

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
    readonly blockingOn: FiberId.FiberId,
    readonly epoch: number,
    readonly asyncTrace: TraceElement
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
      St.hash(this.blockingOn)
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      that instanceof Suspended &&
      St.equals(this.previous, that.previous) &&
      this.interruptible === that.interruptible &&
      this.epoch === that.epoch &&
      this.blockingOn[St.equalsSym](that.blockingOn)
    )
  }
}

export function isDone(status: Status): boolean {
  return status._tag === "Done"
}

export function isInterrupting(status: Status): boolean {
  return isInterruptingSafe(status).run()
}

function isInterruptingSafe(status: Status): IO<boolean> {
  switch (status._tag) {
    case "Done": {
      return IO.succeed(false)
    }
    case "Finishing": {
      return IO.succeed(status.interrupting)
    }
    case "Running": {
      return IO.succeed(status.interrupting)
    }
    case "Suspended": {
      return IO.suspend(isInterruptingSafe(status.previous))
    }
  }
}

function withInterruptingSafe(b: boolean) {
  return (status: Status): IO<Status> => {
    switch (status._tag) {
      case "Done": {
        return IO.succeed(status)
      }
      case "Finishing": {
        return IO.succeed(new Finishing(b))
      }
      case "Running": {
        return IO.succeed(new Running(b))
      }
      case "Suspended": {
        return IO.suspend(withInterruptingSafe(b)(status.previous)).map(
          (previous) =>
            new Suspended(
              previous,
              status.interruptible,
              status.blockingOn,
              status.epoch,
              status.asyncTrace
            )
        )
      }
    }
  }
}

export function withInterrupting(b: boolean) {
  return (status: Status) => withInterruptingSafe(b)(status).run()
}

export function toFinishing(status: Status): Status {
  return toFinishingSafe(status).run()
}

function toFinishingSafe(status: Status): IO<Status> {
  switch (status._tag) {
    case "Done": {
      return IO.succeed(status)
    }
    case "Finishing": {
      return IO.succeed(status)
    }
    case "Running": {
      return IO.succeed(status)
    }
    case "Suspended": {
      return IO.suspend(toFinishingSafe(status.previous))
    }
  }
}
