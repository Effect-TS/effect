import type {
  STMOnFailure,
  STMOnRetry,
  STMOnSuccess
} from "@effect/core/stm/STM/definition/primitives"
import { concreteSTM } from "@effect/core/stm/STM/definition/primitives"
import type { Journal } from "@effect/core/stm/STM/Journal"

type Erased = STM<unknown, unknown, unknown>
type Cont =
  | STMOnFailure<unknown, unknown, unknown, unknown>
  | STMOnRetry<unknown, unknown, unknown, unknown, unknown, unknown>
  | STMOnSuccess<unknown, unknown, unknown, unknown>

export class STMDriver<R, E, A> {
  private yieldOpCount = 2048
  private contStack: Stack<Cont> | undefined
  private envStack: Stack<Env<unknown>>

  constructor(
    readonly self: STM<R, E, A>,
    readonly journal: Journal,
    readonly fiberId: FiberId,
    r0: Env<R>
  ) {
    this.envStack = new Stack(r0)
  }

  private unwindStack(error: unknown, isRetry: boolean): Erased | undefined {
    let result: Erased | undefined = undefined
    while (this.contStack && result == null) {
      const cont = this.contStack.value
      this.contStack = this.contStack.previous
      if (cont._stmtag === "STMOnFailure") {
        if (!isRetry) {
          result = cont.onFailure(error)
        }
      }
      if (cont._stmtag === "STMOnRetry") {
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
          exit = TExit.retry
        } else {
          opCount = 0
        }
      } else {
        const k = curr
        concreteSTM(k)
        switch (k._stmtag) {
          case "STMEffect": {
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
              } else if (STM.isInterruptException(e)) {
                exit = TExit.interrupt(e.fiberId)
              } else {
                throw e
              }
            }
            break
          }

          case "STMOnSuccess": {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case "STMOnFailure": {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case "STMOnRetry": {
            this.contStack = new Stack(k, this.contStack)
            curr = k.stm
            break
          }

          case "STMProvide": {
            this.envStack = new Stack(k.f(this.envStack.value), this.envStack)
            curr = k.stm.ensuring(
              STM.sync(() => {
                this.envStack = this.envStack.previous!
              })
            )
            break
          }

          case "STMSucceedNow": {
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

          case "STMSucceed": {
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
        }
        opCount = opCount + 1
      }
    }

    return exit as TExit<E, A>
  }
}
