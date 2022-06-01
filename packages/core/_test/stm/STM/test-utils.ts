import { constVoid } from "@tsplus/stdlib/data/Function"

export const ExampleError = new Error("fail")

export const STMEnvId = Symbol.for("@effect/core/test/stm/STMEnv")
export type STMEnvId = typeof STMEnvId

/**
 * @tsplus type ets/STMTestEnv
 */
export interface STMEnv {
  readonly ref: TRef<number>
}

/**
 * @tsplus type ets/STMTestEnvOps
 */
export interface STMEnvOps {
  Tag: Tag<STMEnv>
}
export const STMEnv: STMEnvOps = {
  Tag: Tag<STMEnv>()
}

/**
 * @tsplus static ets/STMTestEnvOps make
 */
export function makeSTMEnv(n: number): Effect.UIO<STMEnv> {
  return TRef.makeCommit(n).map((ref) => ({ ref }))
}

export function incrementRefN(n: number, ref: TRef<number>): Effect.UIO<number> {
  return STM.atomically(
    ref
      .get()
      .tap((value) => ref.set(value + 1))
      .tap(() => ref.get())
  ).repeatN(n)
}

export function compute3RefN(
  n: number,
  ref1: TRef<number>,
  ref2: TRef<number>,
  ref3: TRef<number>
): Effect.UIO<number> {
  return STM.atomically(
    STM.Do()
      .bind("value1", () => ref1.get())
      .bind("value2", () => ref2.get())
      .tap(({ value1, value2 }) => ref3.set(value1 + value2))
      .bind("value3", () => ref3.get())
      .tap(({ value1 }) => ref1.set(value1 - 1))
      .tap(({ value2 }) => ref2.set(value2 + 1))
      .map(({ value3 }) => value3)
  ).repeatN(n)
}

export class UnpureBarrier {
  #isOpen = false

  open(): void {
    this.#isOpen = true
  }

  await(): Effect.UIO<void> {
    return Effect.suspend(
      Effect.attempt(() => {
        if (this.#isOpen) {
          return undefined
        }
        throw new Error()
      })
    ).eventually()
  }
}

export function transfer(
  receiver: TRef<number>,
  sender: TRef<number>,
  much: number
): Effect.UIO<number> {
  return STM.atomically(
    sender
      .get()
      .tap((balance) => STM.check(balance >= much))
      .tap(() => receiver.update((n) => n + much))
      .tap(() => sender.update((n) => n - much))
      .zipRight(receiver.get())
  )
}

export function permutation(
  tRef1: TRef<number>,
  tRef2: TRef<number>
): STM<never, never, void> {
  return STM.struct({
    a: tRef1.get(),
    b: tRef2.get()
  })
    .flatMap(({ a, b }) => tRef1.set(b) > tRef2.set(a))
    .map(constVoid)
}

export function chain(
  depth: number,
  next: (_: STM<never, never, number>) => STM<never, never, number>
): Effect.UIO<number> {
  return chainLoop(depth, STM.succeed(0), next)
}

export function chainLoop(
  n: number,
  acc: STM<never, never, number>,
  next: (_: STM<never, never, number>) => STM<never, never, number>
): Effect.UIO<number> {
  return n <= 0
    ? acc.commit()
    : Effect.suspendSucceed(chainLoop(n - 1, next(acc), next))
}
