import { reduce_ } from "../Array"
import * as C from "../Cause"
import * as T from "../Effect"
import * as E from "../Exit"
import * as F from "../Fiber"
import * as FR from "../FiberRef"
import { pipe } from "../Function"
import * as Has from "../Has"
import * as L from "../Layer"
import * as Layer from "../Layer"
import * as M from "../Managed"
import { AtomicReference } from "../Support/AtomicReference"

export class ProcessMap {
  readonly fibers: Set<F.FiberContext<any, any>> = new Set()
  readonly interruptedBy = new AtomicReference<F.FiberID | null>(null)
  readonly causeBy = new AtomicReference<E.Failure<any> | null>(null)
  readonly subscribers = new Set<(fiberId: F.FiberID) => void>()
  readonly identified = new Map<symbol, F.FiberContext<any, any>>()

  constructor() {
    this.fork = this.fork.bind(this)
    this.monitored = this.monitored.bind(this)
    this.notify = this.notify.bind(this)
    this.subscribe = this.subscribe.bind(this)
  }

  fork<S, R, E, A>(effect: T.Effect<S, R, E, A>, has?: Has.Has<any>) {
    if (has && this.identified.has(has[Has.HasURI].key)) {
      return T.die(
        `Fiber (#${
          this.identified.get(has[Has.HasURI].key)?.id.seqNumber
        } already forked`
      )
    }
    if (this.interruptedBy.get) {
      return T.interrupt
    }
    return T.chain_(T.forkDaemon(effect), (f) =>
      T.effectTotal(() => {
        this.fibers.add(f)
        if (has) {
          this.identified.set(has[Has.HasURI].key, f)
        }

        f.onDone((e) => {
          this.fibers.delete(f)

          if (has) {
            this.identified.set(has[Has.HasURI].key, f)
          }

          if (this.interruptedBy.get) {
            return
          }

          const exit = E.flatten(e)

          if (exit._tag === "Failure" && !C.interruptedOnly(exit.cause)) {
            this.notify(f.id, exit)
          }
        })
        return f
      })
    )
  }

  notify(fiberId: F.FiberID, exit: E.Failure<any>) {
    if (this.interruptedBy.get) {
      return
    }
    this.interruptedBy.set(fiberId)
    this.causeBy.set(exit)
    this.subscribers.forEach((s) => {
      s(fiberId)
    })
  }

  subscribe(cb: (fiberId: F.FiberID) => void) {
    const subscription = (fiberId: F.FiberID) => {
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
            T.runAsync(f.interruptAs(id))
          })
        }),
        () =>
          T.chain_(T.result(F.join(f)), (a) => {
            if (a._tag === "Failure") {
              const root = this.causeBy.get

              if (root) {
                return T.halt(C.Then(root.cause, a.cause))
              }
            }
            return T.done(a)
          })
      )
    )
  }
}

export const HasProcessMap = Has.has(ProcessMap)
export type HasProcessMap = Has.HasType<typeof HasProcessMap>

export const processMapLayer = L.service(HasProcessMap).fromEffect(
  T.effectTotal(() => new ProcessMap())
)

/**
 * Fork a new managed process without any identifier, a managed process runs
 * in background and will trigger interruption if any failure happens
 */
export const makeGenericProcess = <S, R, A>(effect: T.Effect<S, R, never, A>) =>
  new Layer.Layer<unknown, R & HasProcessMap, never, HasProcessRegistry>(
    pipe(
      M.fromEffect(T.readService(HasProcessMap)),
      M.chain((pm) =>
        pipe(
          T.accessM((r: R) => T.provideAll_(pm.fork(effect), r)),
          M.makeInterruptible((f) =>
            T.checkDescriptor((d) =>
              pipe(
                f.interruptAs(d.id),
                T.chain((e) => {
                  if (e._tag === "Success") {
                    return T.unit
                  }
                  if (C.interruptedOnly(e.cause)) {
                    return T.unit
                  }
                  const pmCause = pm.causeBy.get
                  if (pmCause) {
                    if (C.contains(e.cause)(pmCause.cause)) {
                      return T.unit
                    }
                  }
                  return T.done(e)
                })
              )
            )
          ),
          M.map(
            (): HasProcessRegistry =>
              ({
                [HasProcessRegistry[Has.HasURI].key]: new ProcessRegistry(pm)
              } as any)
          )
        )
      )
    )
  )

/**
 * Identifies a process in environment
 */
export const hasProcess = <ID extends string>(_: ID) => <A>() =>
  Has.has<Process<A, ID>>()

export type HasProcess<ID extends string, A> = Has.Has<Process<A, ID>>

/**
 * Access a forked process
 */
export class Process<A, ID> {
  readonly _ID!: ID
  readonly _TAG = "@matechs/core/Eff/Layer/Fork"

  constructor(readonly _FIBER: F.FiberContext<never, A>) {}

  getRef<A>(ref: FR.FiberRef<A>) {
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
export const makeProcess = <ID extends string, A>(has: HasProcess<ID, A>) => <S, R>(
  effect: T.Effect<S, R, never, A>
) =>
  new Layer.Layer<
    unknown,
    R & HasProcessMap,
    never,
    HasProcess<ID, A> & HasProcessRegistry
  >(
    pipe(
      M.fromEffect(T.readService(HasProcessMap)),
      M.chain((pm) =>
        pipe(
          pm.fork(effect, has),
          M.makeInterruptible((f) =>
            T.checkDescriptor((d) =>
              pipe(
                f.interruptAs(d.id),
                T.chain((e) => {
                  if (e._tag === "Success") {
                    return T.unit
                  }
                  if (C.interruptedOnly(e.cause)) {
                    return T.unit
                  }
                  const pmCause = pm.causeBy.get
                  if (pmCause) {
                    if (C.contains(e.cause)(pmCause.cause)) {
                      return T.unit
                    }
                  }
                  return T.done(e)
                })
              )
            )
          ),
          M.map((f) => new Process(f)),
          M.chain((a) =>
            M.map_(
              environmentFor(has, a),
              (e): HasProcess<ID, A> & HasProcessRegistry =>
                ({
                  ...e,
                  [HasProcessRegistry[Has.HasURI].key]: new ProcessRegistry(pm)
                } as any)
            )
          )
        )
      )
    )
  )

function environmentFor<T>(
  has: Has.Has<T>,
  a: T
): M.Managed<never, unknown, never, Has.Has<T>>
function environmentFor<T>(
  has: Has.Has<T>,
  a: T
): M.Managed<never, unknown, never, any> {
  return M.fromEffect(
    T.access((r) => ({
      [has[Has.HasURI].key]: Has.mergeEnvironments(has, r, a as any)[
        has[Has.HasURI].key
      ]
    }))
  )
}

export const makeProcessMap = T.effectTotal(() => new ProcessMap())

export const forkTag = <ID extends string>(id: ID) =>
  `@matechs/core/Eff/Layer/Fork/${id}`

export class ProcessRegistry {
  constructor(readonly processMap: ProcessMap) {}

  getRef<A>(ref: FR.FiberRef<A>) {
    return T.map_(
      T.foreach_(this.processMap.fibers, (f) => f.getRef(ref)),
      (a) => reduce_(a, ref.initial, (a, b) => ref.join(a, b))
    )
  }
}

export const HasProcessRegistry = Has.has<ProcessRegistry>()
export type HasProcessRegistry = Has.HasType<typeof HasProcessRegistry>

export const accessProcessRegistryM = T.accessServiceM(HasProcessRegistry)

export const globalRef = <A>(ref: FR.FiberRef<A>) =>
  accessProcessRegistryM((p) => p.getRef(ref))

export const monitored = <S, R, E, A>(effect: T.Effect<S, R, E, A>) =>
  T.accessServiceM(HasProcessMap)((pm) => pm.monitored(effect))
