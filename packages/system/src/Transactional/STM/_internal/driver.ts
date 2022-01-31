// ets_tracing: off

import type { FiberID } from "../../../Fiber/index.js"
import { Stack } from "../../../Stack/index.js"
import type { Journal } from "../Journal/index.js"
import * as TExit from "../TExit/index.js"
import type { STMOnFailure, STMOnRetry } from "./primitives.js"
import * as STM from "./primitives.js"

type Erased = STM.STM<unknown, unknown, unknown>
type Cont =
  | STMOnFailure<unknown, unknown, unknown, unknown>
  | STMOnRetry<unknown, unknown, unknown>
  | STM.STMOnSuccess<unknown, unknown, unknown, unknown>

export class STMDriver<R, E, A> {
  private contStack: Stack<Cont> | undefined
  private envStack: Stack<unknown>

  constructor(
    readonly self: STM.STM<R, E, A>,
    readonly journal: Journal,
    readonly fiberId: FiberID,
    r0: R
  ) {
    this.envStack = new Stack(r0)
  }

  private unwindStack(error: unknown, isRetry: boolean): Erased | undefined {
    let result: Erased | undefined = undefined
    while (this.contStack && !result) {
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

    while (!exit && curr) {
      const k = curr
      STM.concreteSTM(k)
      switch (k._typeId) {
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
        case STM.STMProvideSomeTypeId: {
          this.envStack = new Stack(k.f(this.envStack.value), this.envStack)
          curr = STM.ensuring_(
            k.stm,
            STM.succeedWith(() => {
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
            if (STM.isFailException(e)) {
              curr = this.unwindStack(e.e, false)
              if (!curr) {
                exit = TExit.fail(e.e)
              }
            } else if (STM.isRetryException(e)) {
              curr = this.unwindStack(undefined, true)
              if (!curr) {
                exit = TExit.retry
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
        }
      }
    }

    return exit as TExit.TExit<E, A>
  }
}
