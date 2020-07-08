import { reduce_ } from "../../Array"
import { UnionToIntersection } from "../../Base/Apply"
import { Then } from "../Cause"
import { contains } from "../Cause/contains"
import { runAsync, DefaultEnv } from "../Effect/runtime"
import { Failure } from "../Exit"
import { FiberID } from "../Fiber"
import { FiberContext } from "../Fiber/context"
import { FiberRef } from "../FiberRef"
import { accessServiceM, AnyRef, has, HasType, HasURI, mergeEnvironments } from "../Has"
import { coerceSE } from "../Managed/deps"
import { AtomicReference } from "../Support/AtomicReference"
import { Erase } from "../Utils"

import * as T from "./deps"

export class ProcessMap {
  readonly fibers: Set<FiberContext<any, any>> = new Set()
  readonly interruptedBy = new AtomicReference<FiberID | null>(null)
  readonly causeBy = new AtomicReference<Failure<any> | null>(null)
  readonly subscribers = new Set<(fiberId: FiberID) => void>()
  readonly identified = new Map<symbol, FiberContext<any, any>>()

  fork<S, R, E, A>(effect: T.Effect<S, R, E, A>, has?: T.Has<any, any>) {
    if (has && this.identified.has(has[HasURI].key)) {
      return T.die(
        `Fiber (${
          has[HasURI].brand && typeof has[HasURI].brand === "string"
            ? `${has[HasURI].brand}`
            : `#${this.identified.get(has[HasURI].key)?.id.seqNumber}`
        }) already forked`
      )
    }
    if (this.interruptedBy.get) {
      return T.interrupt
    }
    return T.chain_(T.forkDaemon(effect), (f) =>
      T.effectTotal(() => {
        this.fibers.add(f)
        if (has) {
          this.identified.set(has[HasURI].key, f)
        }

        f.onDone((e) => {
          this.fibers.delete(f)

          if (has) {
            this.identified.set(has[HasURI].key, f)
          }

          if (this.interruptedBy.get) {
            return
          }

          const exit = T.exitFlatten(e)

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

export class ProcessRegistry {
  constructor(readonly processMap: ProcessMap) {}

  getRef<A>(ref: FiberRef<A>) {
    return T.map_(
      T.effectForeach_(this.processMap.fibers, (f) => f.getRef(ref)),
      (a) => reduce_(a, ref.initial, (a, b) => ref.join(a, b))
    )
  }
}

export const HasProcessRegistry = has<ProcessRegistry>()()
export type HasProcessRegistry = HasType<typeof HasProcessRegistry>

export const accessProcessRegistryM = accessServiceM(HasProcessRegistry)

export const globalRef = <A>(ref: FiberRef<A>) =>
  accessProcessRegistryM((p) => p.getRef(ref))

export class Layer<S, R, E, A> {
  constructor(readonly build: T.Managed<S, [R, ProcessMap], E, A>) {
    this.use = this.use.bind(this)
  }

  use<S1, R1, E1, A1>(
    effect: T.Effect<S1, R1 & A, E1, A1>
  ): T.Effect<S | S1, R & R1, E | E1, A1> {
    return T.chain_(makeProcessMap, (pm) =>
      T.provideSome_(
        T.managedUse_(this.build, (p) =>
          T.accessM(([r, pm]: [R & R1, ProcessMap]) =>
            coerceSE<S | S1, E | E1>()(
              pm.monitored(T.provideAll_(effect, { ...r, ...p }))
            )
          )
        ),
        (r: R & R1): [R & R1, ProcessMap] => [r, pm]
      )
    )
  }
}

export type AsyncR<R, A> = Layer<unknown, R, never, A>

/**
 * Fork a new managed process without any identifier, a managed process runs
 * in background and will trigger interruption if any failure happens
 */
export const makeGenericProcess = <S, R, E, A>(effect: T.Effect<S, R, E, A>) =>
  new Layer<unknown, R, E, HasProcessRegistry>(
    T.managedMap_(
      T.makeInterruptible_(
        T.accessM(([r, pm]: [R, ProcessMap]) =>
          T.provideAll_(
            T.map_(pm.fork(effect), (x) => [pm, x] as const),
            r
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
                if (contains(e.cause)(pmCause.cause)) {
                  return T.unit
                }
              }
              return T.done(e)
            })
          })
      ),
      ([pm]): HasProcessRegistry =>
        ({
          [HasProcessRegistry[HasURI].key]: new ProcessRegistry(pm)
        } as any)
    )
  )

/**
 * Identifies a process in environment
 */
export const hasProcess = <ID extends string>(id: ID) => <E, A>(k?: AnyRef) =>
  has<Process<E, A>>(k)(id)

export type HasProcess<ID extends string, E, A> = T.Has<Process<E, A>, ID>

/**
 * Access a forked process
 */
export class Process<E, A> {
  readonly _TAG = "@matechs/core/Eff/Layer/Fork"

  constructor(readonly _FIBER: FiberContext<E, A>) {}

  getRef<A>(ref: FiberRef<A>) {
    return this._FIBER.getRef(ref)
  }

  get id() {
    return this._FIBER.id
  }

  get state() {
    return this._FIBER.state.get
  }
}

/**
 * Fork a new managed process, a managed process runs in background and
 * will trigger interruption if any failure happens
 */
export const makeProcess = <ID extends string, E, A>(has: HasProcess<ID, E, A>) => <
  S,
  R
>(
  effect: T.Effect<S, R, E, A>
) =>
  new Layer<unknown, R, E, HasProcess<ID, E, A> & HasProcessRegistry>(
    T.managedChain_(
      T.managedMap_(
        T.makeInterruptible_(
          T.accessM(([r, pm]: [R, ProcessMap]) =>
            T.provideAll_(
              T.map_(pm.fork(effect, has), (x) => [pm, x] as const),
              r
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
                  if (contains(e.cause)(pmCause.cause)) {
                    return T.unit
                  }
                }
                return T.done(e)
              })
            })
        ),
        ([pm, f]) => [new Process(f), pm] as const
      ),
      ([a, pm]) =>
        T.managedMap_(
          environmentFor(has, a),
          (e): HasProcess<ID, E, A> & HasProcessRegistry =>
            ({
              ...e,
              [HasProcessRegistry[HasURI].key]: new ProcessRegistry(pm)
            } as any)
        )
    )
  )

export const pure = <T, K>(has: T.Has<T, K>) => (resource: T) =>
  new Layer<never, unknown, never, T.Has<T, K>>(
    T.managedChain_(T.fromEffect(T.succeedNow(resource)), (a) => environmentFor(has, a))
  )

export const prepare = <T, K>(has: T.Has<T, K>) => <S, R, E, A extends T>(
  acquire: T.Effect<S, R & HasProcessRegistry, E, A>
) => ({
  open: <S1, R1, E1>(
    open: (_: A) => T.Effect<S1, R1 & HasProcessRegistry, E1, any>
  ) => ({
    release: <S2, R2, E2>(
      release: (_: A) => T.Effect<S2, R2 & HasProcessRegistry, E2, any>
    ) =>
      fromManaged(has)(
        T.managedChain_(
          T.makeExit_(acquire, (a) => release(a)),
          (a) => T.fromEffect(T.map_(open(a), () => a))
        )
      )
  })
})

export const service = <T, K>(has: T.Has<T, K>) => ({
  fromEffect: fromEffect(has),
  fromManaged: fromManaged(has),
  pure: pure(has),
  prepare: prepare(has)
})

export const fromEffect = <T, K>(has: T.Has<T, K>) => <S, R, E>(
  resource: T.Effect<S, R, E, T>
) =>
  new Layer<S, R, E, T.Has<T, K>>(
    T.managedProvideSome_(
      T.managedChain_(T.fromEffect(resource), (a) => environmentFor(has, a)),
      ([r]) => r
    )
  )

export const fromManaged = <T, K>(has: T.Has<T, K>) => <S, R, E>(
  resource: T.Managed<S, R & HasProcessRegistry, E, T>
) =>
  new Layer<S, R, E, T.Has<T, K>>(
    T.managedProvideSome_(
      T.managedChain_(resource, (a) => environmentFor(has, a)),
      ([r, pm]) =>
        ({
          ...r,
          [HasProcessRegistry[HasURI].key]: new ProcessRegistry(pm)
        } as any)
    )
  )

export const fromManagedEnv = <S, R, E, A>(resource: T.Managed<S, R, E, A>) =>
  new Layer<S, R, E, A>(T.managedProvideSome_(resource, ([r]) => r))

export const fromEffectEnv = <S, R, E, A>(resource: T.Effect<S, R, E, A>) =>
  new Layer<S, R, E, A>(T.managedProvideSome_(T.fromEffect(resource), ([r]) => r))

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
  left: Layer<S, R, E, A>
) => using_<S, R, E, A, S2, R2, E2, A2>(left, right)

export const using_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, Erase<R, A2> & R2, E | E2, A & A2>(
    T.managedChain_(right.build, (a2) =>
      T.managedMap_(
        T.managedProvideSome_(left.build, ([r0, pm]: [R & R2, ProcessMap]): [
          R & R2 & A2,
          ProcessMap
        ] => [
          {
            ...r0,
            ...a2
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
      T.managedForeach_(ls, (l) => l.build),
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

function environmentFor<T, K>(
  has: T.Has<T, K>,
  a: T
): T.Managed<never, unknown, never, T.Has<T, K>>
function environmentFor<T, K>(
  has: T.Has<T, K>,
  a: T
): T.Managed<never, unknown, never, any> {
  return T.fromEffect(
    T.access((r) => ({
      [has[HasURI].key]: mergeEnvironments(has, r, a as any)[has[HasURI].key]
    }))
  )
}

/**
 * Type level bound to make sure a layer is complete
 */
export const main = <S, E, A>(layer: Layer<S, DefaultEnv, E, A>) => layer
