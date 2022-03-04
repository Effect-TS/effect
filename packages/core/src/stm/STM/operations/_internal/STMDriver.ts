import { Stack } from "../../../../data/Stack"
import type { FiberId } from "../../../../io/FiberId"
import type { STMOnFailure, STMOnRetry, STMOnSuccess } from "../../definition"
import {
  concreteSTM,
  STM,
  STMEffectTypeId,
  STMOnFailureTypeId,
  STMOnRetryTypeId,
  STMOnSuccessTypeId,
  STMProvideTypeId,
  STMSucceedNowTypeId,
  STMSucceedTypeId
} from "../../definition"
import type { Journal } from "../../Journal"
import { TExit } from "../../TExit"

type Erased = STM<unknown, unknown, unknown>
type Cont =
  | STMOnFailure<unknown, unknown, unknown, unknown>
  | STMOnRetry<unknown, unknown, unknown, unknown, unknown, unknown>
  | STMOnSuccess<unknown, unknown, unknown, unknown>

export class STMDriver<R, E, A> {
  private yieldOpCount = 2048
  private contStack: Stack<Cont> | undefined
  private envStack: Stack<unknown>

  constructor(
    readonly self: STM<R, E, A>,
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
      if (cont._typeId === STMOnFailureTypeId) {
        if (!isRetry) {
          result = cont.onFailure(error)
        }
      }
      if (cont._typeId === STMOnRetryTypeId) {
        if (isRetry) {
          result = cont.onRetry()
        }
      }
    }
    return result
  }

  run(): TExit<E, A> {
    let curr = this.self as Erased | undefined
    let exit: TExit<unknown, unknown> | undefined = undefined
    let opCount = 0

    while (exit == null && curr != null) {
      if (opCount === this.yieldOpCount) {
        let valid = true
        for (const entry of this.journal) {
          valid = entry[1].use((_) => _.isValid())
        }
        if (!valid) {
          exit = TExit.Retry
        } else {
          opCount = 0
        }
      } else {
        const k = curr
        concreteSTM(k)
        switch (k._typeId) {
          case STMEffectTypeId: {
            try {
              const a = k.f(this.journal, this.fiberId, this.envStack.value)
              if (!this.contStack) {
                exit = TExit.Succeed(a)
              } else {
                const cont = this.contStack.value
                this.contStack = this.contStack.previous
                curr = cont.apply(a)
              }
            } catch (e) {
              if (STM.isRetryException(e)) {
                curr = this.unwindStack(undefined, true)
                if (!curr) {
                  exit = TExit.Retry
                }
              } else if (STM.isFailException(e)) {
                curr = this.unwindStack(e.e, false)
                if (!curr) {
                  exit = TExit.Fail(e.e)
                }
              } else if (STM.isDieException(e)) {
                curr = this.unwindStack(e.e, false)
                if (!curr) {
                  exit = TExit.Die(e.e)
                }
              } else if (STM.isInterruptException(e)) {
                exit = TExit.Interrupt(e.fiberId)
              } else {
                throw e
              }
            }
            break
          }

          case STMOnSuccessTypeId: {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case STMOnFailureTypeId: {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case STMOnRetryTypeId: {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case STMProvideTypeId: {
            this.envStack = new Stack(k.f(this.envStack.value), this.envStack)
            curr = k.stm.ensuring(
              STM.succeed(() => {
                this.envStack = this.envStack.previous!
              })
            )
            break
          }

          case STMSucceedNowTypeId: {
            const a = k.a
            if (!this.contStack) {
              exit = TExit.Succeed(a)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              curr = cont.apply(a)
            }
            break
          }

          case STMSucceedTypeId: {
            const a = k.a()
            if (!this.contStack) {
              exit = TExit.Succeed(a)
            } else {
              const cont = this.contStack.value
              this.contStack = this.contStack.previous
              curr = cont.apply(a)
            }
            break
          }
        }
        opCount = opCount + 1
      }
    }

    return exit as TExit<E, A>
  }
}
