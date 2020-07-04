import { reduce_ } from "../../Array"
import { UnionToIntersection } from "../../Base/Apply"
import { Then } from "../Cause"
import { contains } from "../Cause/contains"
import { runAsync } from "../Effect/runtime"
import { Failure } from "../Exit"
import { FiberID } from "../Fiber"
import { FiberContext } from "../Fiber/context"
import { mergeEnvironments } from "../Has"
import { coerceSE } from "../Managed/deps"
import { AtomicReference } from "../Support/AtomicReference"

import * as T from "./deps"

class ProcessMap {
  readonly fibers: Set<FiberContext<any, any>> = new Set()
  readonly interruptedBy = new AtomicReference<FiberID | null>(null)
  readonly causeBy = new AtomicReference<Failure<any> | null>(null)
  readonly subscribers = new Set<(fiberId: FiberID) => void>()

  fork<S, R, E, A>(effect: T.Effect<S, R, E, A>) {
    if (this.interruptedBy.get) {
      return T.interrupt
    }
    return T.chain_(T.forkDaemon(effect), (f) =>
      T.effectTotal(() => {
        this.fibers.add(f)
        f.onDone(() => {
          this.fibers.delete(f)
        })
        f.onDone((e) => {
          const exit = T.exitFlatten(e)

          if (this.interruptedBy.get) {
            return
          }

          if (exit._tag === "Failure" && !T.interruptedOnly(exit.cause)) {
            this.notify(f.id, exit)
          }
        })
        return f
      })
    )
  }

  notify(fiberId: FiberID, exit: Failure<any>) {
    if (this.interruptedBy.get) {
      return
    }
    this.interruptedBy.set(fiberId)
    this.causeBy.set(exit)
    this.subscribers.forEach((s) => {
      s(fiberId)
    })
  }

  subscribe(cb: (fiberId: FiberID) => void) {
    const subscription = (fiberId: FiberID) => {
      cb(fiberId)
      this.subscribers.delete(subscription)
    }
    this.subscribers.add(subscription)
  }

  monitored<S, R, E, A>(effect: T.Effect<S, R, E, A>) {
    if (this.fibers.size === 0) {
      return effect
    }
    return T.chain_(T.forkDaemon(effect), (f) =>
      T.chain_(
        T.effectTotal(() => {
          this.subscribe((id) => {
            runAsync(f.interruptAs(id))
          })
        }),
        () =>
          T.chain_(T.result(T.join(f)), (a) => {
            if (a._tag === "Failure") {
              const root = this.causeBy.get

              if (root) {
                return T.halt(Then(root.cause, a.cause))
              }
            }
            return T.done(a)
          })
      )
    )
  }
}

export const makeProcessMap = T.effectTotal(() => new ProcessMap())

export const forkTag = <ID extends string>(id: ID) =>
  `@matechs/core/Eff/Layer/Fork/${id}`

export const provideForkId = <S, R, E, A, ID extends string>(
  effect: T.Effect<S, R, E, A>,
  fork: Process<ID>
) =>
  T.provideSome_(
    effect,
    (r: R): R & T.Has<Process<ID>> =>
      ({
        ...r,
        [forkTag(fork._ID)]: fork
      } as any)
  )

export class Layer<S, R, E, A> {
  constructor(readonly build: T.Managed<S, [R, ProcessMap], E, A>) {}

  use<S1, R1, E1, A1>(
    effect: T.Effect<S1, R1 & A, E1, A1>
  ): T.Effect<S | S1, R & R1, E | E1, A1> {
    return T.chain_(makeProcessMap, (pm) =>
      T.provideSome_(
        T.managedUse_(this.build, (p) =>
          T.accessM(([r, pm]: [R & R1, ProcessMap]) =>
            coerceSE<S | S1, E | E1>()(
              pm.monitored(T.provideAll_(effect, { ...p, ...r }))
            )
          )
        ),
        (r: R & R1): [R & R1, ProcessMap] => [r, pm]
      )
    )
  }
}

export const makeGenericProcess = <S, R, E, A>(effect: T.Effect<S, R, E, A>) =>
  new Layer<unknown, R, E, {}>(
    T.managedMap_(
      T.makeExit_(
        T.interruptible(
          T.accessM(([r, pm]: [R, ProcessMap]) =>
            T.provideAll_(
              T.map_(pm.fork(effect), (x) => [pm, x] as const),
              r
            )
          )
        ),
        ([pm, f]) =>
          T.checkDescriptor((d) => {
            return T.chain_(f.interruptAs(d.id), (e) => {
              if (e._tag === "Success") {
                return T.unit
              }
              if (T.interruptedOnly(e.cause)) {
                return T.unit
              }
              const pmCause = pm.causeBy.get
              if (pmCause) {
                if (contains(pmCause.cause)(e.cause)) {
                  return T.unit
                }
              }
              return T.done(e)
            })
          })
      ),
      () => ({})
    )
  )

export class Process<ID extends string> {
  readonly _TAG = "@matechs/core/Eff/Layer/Fork"

  constructor(readonly _ID: ID, readonly _FIBER: FiberContext<any, any>) {}
}

export const accessProcessM = <ID extends string>(id: ID) => <S, R, E, A>(
  f: (fork: Process<ID>) => T.Effect<S, R, E, A>
) => T.accessM((r: T.Has<Process<ID>>) => f(r[forkTag(id)]))

export const makeProcess = <ID extends string>(id: ID) => <S, R, E, A>(
  effect: T.Effect<S, R, E, A>
) =>
  new Layer<unknown, R, E, T.Has<Process<ID>>>(
    T.managedMap_(
      T.makeExit_(
        T.interruptible(
          T.accessM(([r, pm]: [R, ProcessMap]) =>
            T.provideAll_(
              T.map_(pm.fork(effect), (x) => [pm, x] as const),
              r
            )
          )
        ),
        ([pm, f]) =>
          T.checkDescriptor((d) => {
            return T.chain_(f.interruptAs(d.id), (e) => {
              if (e._tag === "Success") {
                return T.unit
              }
              if (T.interruptedOnly(e.cause)) {
                return T.unit
              }
              const pmCause = pm.causeBy.get
              if (pmCause) {
                if (contains(pmCause.cause)(e.cause)) {
                  return T.unit
                }
              }
              return T.done(e)
            })
          })
      ),
      ([_, f]) => (({ [forkTag(id)]: new Process(id, f) } as any) as T.Has<Process<ID>>)
    )
  )

export const pure = <T>(has: T.Has<T>) => (resource: T.Unbrand<T>) =>
  new Layer<never, unknown, never, T.Has<T>>(
    T.managedMap_(T.fromEffect(T.succeedNow(resource)), (a) =>
      mergeEnvironments(has, {}, a)
    )
  )

export const prepare = <T>(has: T.Has<T>) => <S, R, E, A extends T.Unbrand<T>>(
  acquire: T.Effect<S, R, E, A>
) => ({
  open: <S1, R1, E1>(open: (_: A) => T.Effect<S1, R1, E1, any>) => ({
    release: <S2, R2, E2>(release: (_: A) => T.Effect<S2, R2, E2, any>) =>
      fromManaged(has)(
        T.managedChain_(
          T.makeExit_(acquire, (a) => release(a)),
          (a) => T.fromEffect(T.map_(open(a), () => a))
        )
      )
  })
})

export const service = <T>(has: T.Has<T>) => ({
  fromEffect: fromEffect(has),
  fromManaged: fromManaged(has),
  pure: pure(has),
  prepare: prepare(has)
})

export const fromEffect = <T>(has: T.Has<T>) => <S, R, E>(
  resource: T.Effect<S, R, E, T.Unbrand<T>>
) =>
  new Layer<S, R, E, T.Has<T>>(
    T.managedProvideSome_(
      T.managedChain_(T.fromEffect(resource), (a) =>
        T.fromEffect(T.access((r) => mergeEnvironments(has, r, a)))
      ),
      ([r]) => r
    )
  )

export const fromManaged = <T>(has: T.Has<T>) => <S, R, E>(
  resource: T.Managed<S, R, E, T.Unbrand<T>>
) =>
  new Layer<S, R, E, T.Has<T>>(
    T.managedProvideSome_(
      T.managedChain_(resource, (a) =>
        T.fromEffect(T.access((r) => mergeEnvironments(has, r, a)))
      ),
      ([r]) => r
    )
  )

export const fromManagedEnv = <S, R, E, A>(
  resource: T.Managed<S, R, E, A>,
  overridable: "overridable" | "final" = "final"
) =>
  new Layer<S, R, E, A>(
    T.managedProvideSome_(
      T.managedChain_(resource, (a) =>
        T.fromEffect(
          T.access((r: R) =>
            overridable === "final" ? { ...r, ...a } : { ...a, ...r }
          )
        )
      ),
      ([r]) => r
    )
  )

export const fromEffectEnv = <S, R, E, A>(
  resource: T.Effect<S, R, E, A>,
  overridable: "overridable" | "final" = "final"
) =>
  new Layer<S, R, E, A>(
    T.managedProvideSome_(
      T.managedChain_(T.fromEffect(resource), (a) =>
        T.fromEffect(
          T.access((r: R) =>
            overridable === "final" ? { ...r, ...a } : { ...a, ...r }
          )
        )
      ),
      ([r]) => r
    )
  )

export const zip_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, R & R2, E | E2, A & A2>(
    T.managedChain_(left.build, (l) =>
      T.managedChain_(right.build, (r) =>
        T.fromEffect(T.effectTotal(() => ({ ...l, ...r })))
      )
    )
  )

export const using = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R & A2, E, A>
) => using_<S, R, E, A, S2, R2, E2, A2>(left, right)

export const using_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R & A2, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, R & R2, E | E2, A & A2>(
    T.managedChain_(right.build, (a2) =>
      T.managedMap_(
        T.managedProvideSome_(left.build, ([r0, pm]: [R & R2, ProcessMap]): [
          R & R2 & A2,
          ProcessMap
        ] => [
          {
            ...a2,
            ...r0
          },
          pm
        ]),
        (a) => ({ ...a2, ...a })
      )
    )
  )

export const zipPar = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => zipPar_(left, right)

export const zipPar_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<unknown, R & R2, E | E2, A & A2>(
    T.managedChain_(
      T.managedZipWithPar_(left.build, right.build, (a, b) => [a, b] as const),
      ([l, r]) => T.fromEffect(T.effectTotal(() => ({ ...l, ...r })))
    )
  )

export type MergeS<Ls extends Layer<any, any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any, any>] ? X : never
}[number]

export type MergeR<Ls extends Layer<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any, any>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export type MergeE<Ls extends Layer<any, any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X, any>] ? X : never
}[number]

export type MergeA<Ls extends Layer<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, any, infer X>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export const all = <Ls extends Layer<any, any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any, any> }
): Layer<MergeS<Ls>, MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
  new Layer(
    T.managedMap_(
      T.foreach_(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )

export const allPar = <Ls extends Layer<any, any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any, any> }
): Layer<unknown, MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
  new Layer(
    T.managedMap_(
      T.foreachPar_(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )

export const allParN = (n: number) => <Ls extends Layer<any, any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any, any> }
): Layer<unknown, MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
  new Layer(
    T.managedMap_(
      T.foreachParN_(n)(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )
