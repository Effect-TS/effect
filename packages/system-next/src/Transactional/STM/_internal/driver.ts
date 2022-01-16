// ets_tracing: off

import type { FiberId } from "../../../FiberId"
import { Stack } from "../../../Stack"
import type { Journal } from "../Journal/index"
import * as TExit from "../TExit"
import type { STMOnFailure, STMOnRetry } from "./primitives"
import * as STM from "./primitives"

type Erased = STM.STM<unknown, unknown, unknown>
type Cont =
  | STMOnFailure<unknown, unknown, unknown, unknown>
  | STMOnRetry<unknown, unknown, unknown>
  | STM.STMOnSuccess<unknown, unknown, unknown, unknown>

export class STMDriver<R, E, A> {
  // private DefaultJournalSize = 4
  // private MaxRetries = 10
  private yieldOpCount = 2048
  private contStack: Stack<Cont> | undefined
  private envStack: Stack<unknown>

  constructor(
    readonly self: STM.STM<R, E, A>,
    readonly journal: Journal,
    readonly fiberId: FiberId,
    r0: R
  ) {
    this.envStack = new Stack(r0)
  }

  private unwindStack(error: unknown, isRetry: boolean): Erased | undefined {
    let result: Erased | undefined = undefined
    while (this.contStack && result == null) {
      const cont = this.contStack.value
      this.contStack = this.contStack.previous
      if (cont._typeId === STM.STMOnFailureTypeId) {
        if (!isRetry) {
          result = cont.onFailure(error)
        }
      }
      if (cont._typeId === STM.STMOnRetryTypeId) {
        if (isRetry) {
          result = cont.onRetry
        }
      }
    }
    return result
  }

  run(): TExit.TExit<E, A> {
    let curr = this.self as Erased | undefined
    let exit: TExit.TExit<unknown, unknown> | undefined = undefined
    let opCount = 0

    while (exit == null && curr != null) {
      if (opCount === this.yieldOpCount) {
        let valid = true
        for (const entry of this.journal) {
          valid = entry[1].use((_) => _.isValid())
        }
        if (!valid) {
          exit = TExit.retry
        } else {
          opCount = 0
        }
      } else {
        const k = curr
        STM.concreteSTM(k)
        switch (k._typeId) {
          case STM.STMEffectTypeId: {
            try {
              const a = k.f(this.journal, this.fiberId, this.envStack.value)
              if (!this.contStack) {
                exit = TExit.succeed(a)
              } else {
                const cont = this.contStack.value
                this.contStack = this.contStack.previous
                curr = cont.apply(a)
              }
            } catch (e) {
              if (STM.isRetryException(e)) {
                curr = this.unwindStack(undefined, true)
                if (!curr) {
                  exit = TExit.retry
                }
              } else if (STM.isFailException(e)) {
                curr = this.unwindStack(e.e, false)
                if (!curr) {
                  exit = TExit.fail(e.e)
                }
              } else if (STM.isDieException(e)) {
                curr = this.unwindStack(e.e, false)
                if (!curr) {
                  exit = TExit.die(e.e)
                }
              } else {
                throw e
              }
            }
            break
          }
          case STM.STMSucceedTypeId: {
            const a = k.a()
            if (!this.contStack) {
              exit = TExit.succeed(a)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              curr = cont.apply(a)
            }
            break
          }
          case STM.STMSucceedNowTypeId: {
            const a = k.a
            if (!this.contStack) {
              exit = TExit.succeed(a)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              curr = cont.apply(a)
            }
            break
          }
          case STM.STMProvideTypeId: {
            this.envStack = new Stack(k.f(this.envStack.value), this.envStack)
            curr = STM.ensuring_(
              k.stm,
              STM.succeed(() => {
                this.envStack = this.envStack.previous!
              })
            )
            break
          }
          case STM.STMOnRetryTypeId: {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }
          case STM.STMOnFailureTypeId: {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }
          case STM.STMOnSuccessTypeId: {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }
        }
      }
    }

    return exit as TExit.TExit<E, A>
  }
}
