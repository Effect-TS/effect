import * as Option from "../Option.ts"
import * as AsyncResult from "../reactivity/AsyncResult.ts"
import type * as Atom from "../reactivity/Atom.ts"
import * as Stream from "../Stream.ts"

export const TypeId = "~effect/reactivity/Atom/Query"

let activation = 0
let activationPending = false
const endActivation = () => {
  activationPending = false
}

// A snapshot read and its following subscription share a synchronous execution,
// even if the Effect completed before the observer was attached.
export const currentActivation = (): number => {
  if (!activationPending) {
    activationPending = true
    activation++
    Promise.resolve().then(endActivation)
  }
  return activation
}

export interface Policy {
  readonly staleTime: number
}

export const policy = (atom: Atom.Atom<any>): Policy | undefined => (atom as any)[TypeId]

export const timestamp = (result: AsyncResult.AsyncResult<unknown, unknown>): number | undefined =>
  result._tag === "Success" ?
    result.timestamp :
    result._tag === "Failure" && Option.isSome(result.previousSuccess) ?
    result.previousSuccess.value.timestamp :
    undefined

export const isUsable = (value: unknown): value is AsyncResult.AsyncResult<unknown, unknown> => {
  if (!AsyncResult.isAsyncResult(value)) return false
  if (value._tag === "Success") return !Stream.isStream(value.value)
  return value._tag !== "Failure" || Option.isNone(value.previousSuccess) ||
    !Stream.isStream(value.previousSuccess.value.value)
}

export const canReuse = (value: unknown): boolean => isUsable(value) && !value.waiting && timestamp(value) !== undefined

export const isStale = (value: unknown, staleTime: number): boolean => {
  if (!isUsable(value)) return true
  const time = timestamp(value)
  return time === undefined || !(Date.now() - time < staleTime)
}
