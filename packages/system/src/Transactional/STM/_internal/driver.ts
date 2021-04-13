import type { FiberID } from "../../../Fiber"
import type { Journal } from "../Journal/index"
import * as TExit from "../TExit"
import type { STMOnFailure, STMOnRetry } from "./primitives"
import * as STM from "./primitives"

type Erased = STM.STM<unknown, unknown, unknown>
type Cont =
  | STMOnFailure<unknown, unknown, unknown, unknown>
  | STMOnRetry<unknown, unknown, unknown>
  | STM.STMOnSuccess<unknown, unknown, unknown, unknown>

function unwindStack(
  contStack: Cont[],
  error: unknown,
  isRetry: boolean
): Erased | undefined {
  let result: Erased | undefined = undefined
  while (contStack.length > 0 && !result) {
    const cont = contStack.pop()!
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

export function run<R, E, A>(
  self: STM.STM<R, E, A>,
  journal: Journal,
  fiberId: FiberID,
  r0: R
): TExit.TExit<E, A> {
  const contStack = [] as Cont[]
  const envStack = [r0] as unknown[]
  let curr = self as Erased | undefined
  let exit: TExit.TExit<unknown, unknown> | undefined = undefined

  while (!exit && curr) {
    const k = curr
    STM.concreteSTM(k)
    switch (k._typeId) {
      case STM.STMSucceedTypeId: {
        const a = k.a()
        if (contStack.length === 0) {
          exit = TExit.succeed(a)
        } else {
          curr = contStack.pop()!.apply(a)
        }
        break
      }
      case STM.STMSucceedNowTypeId: {
        const a = k.a
        if (contStack.length === 0) {
          exit = TExit.succeed(a)
        } else {
          curr = contStack.pop()!.apply(a)
        }
        break
      }
      case STM.STMProvideSomeTypeId: {
        envStack.push(k.f(envStack[envStack.length - 1]))
        curr = STM.ensuring_(
          k.stm,
          STM.succeedL(() => {
            envStack.pop()
          })
        )
        break
      }
      case STM.STMOnRetryTypeId: {
        contStack.push(k)
        curr = k.stm
        break
      }
      case STM.STMOnFailureTypeId: {
        contStack.push(k)
        curr = k.stm
        break
      }
      case STM.STMOnSuccessTypeId: {
        contStack.push(k)
        curr = k.stm
        break
      }
      case STM.STMEffectTypeId: {
        try {
          const a = k.f(journal, fiberId, envStack[envStack.length - 1])
          if (contStack.length === 0) {
            exit = TExit.succeed(a)
          } else {
            curr = contStack.pop()!.apply(a)
          }
        } catch (e) {
          if (STM.isFailException(e)) {
            curr = unwindStack(contStack, e.e, false)
            if (!curr) {
              exit = TExit.fail(e.e)
            }
          } else if (STM.isRetryException(e)) {
            curr = unwindStack(contStack, undefined, true)
            if (!curr) {
              exit = TExit.retry
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
