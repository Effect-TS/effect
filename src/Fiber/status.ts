/**
 * tracing: off
 */
import * as S from "../Sync"
import type { FiberID } from "./id"

export type Status = Done | Finishing | Running | Suspended

export class Done {
  readonly _tag = "Done"
}

export class Finishing {
  readonly _tag = "Finishing"

  constructor(readonly interrupting: boolean) {}
}

export class Running {
  readonly _tag = "Running"

  constructor(readonly interrupting: boolean) {}
}

export class Suspended {
  readonly _tag = "Suspended"

  constructor(
    readonly previous: Status,
    readonly interruptible: boolean,
    readonly epoch: number,
    readonly blockingOn: readonly FiberID[]
  ) {}
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

export const toFinishing = (s: Status): Status => {
  return S.run(toFinishingSafe(s))
}

export const toFinishingSafe = (s: Status): S.UIO<Status> => {
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
