import type * as Cause from "../Cause.js"
import * as Context from "../Context.js"
import type * as Deferred from "../Deferred.js"
import * as Duration from "../Duration.js"
import type { Effect } from "../Effect.js"
import type { RuntimeFiber } from "../Fiber.js"
import { dual, identity } from "../Function.js"
import * as MutableHashMap from "../MutableHashMap.js"
import { pipeArguments } from "../Pipeable.js"
import type * as RcMap from "../RcMap.js"
import type * as Scope from "../Scope.js"
import * as coreEffect from "./core-effect.js"
import * as core from "./core.js"
import * as circular from "./effect/circular.js"
import * as fiberRuntime from "./fiberRuntime.js"

/** @internal */
export const TypeId: RcMap.TypeId = Symbol.for("effect/RcMap") as RcMap.TypeId

type State<K, A, E> = State.Open<K, A, E> | State.Closed

declare namespace State {
  interface Open<K, A, E> {
    readonly _tag: "Open"
    readonly map: MutableHashMap.MutableHashMap<K, Entry<A, E>>
  }

  interface Closed {
    readonly _tag: "Closed"
  }

  interface Entry<A, E> {
    readonly deferred: Deferred.Deferred<A, E>
    readonly scope: Scope.CloseableScope
    fiber: RuntimeFiber<void, never> | undefined
    refCount: number
  }
}

const variance: RcMap.RcMap.Variance<any, any, any> = {
  _K: identity,
  _A: identity,
  _E: identity
}

class RcMapImpl<K, A, E> implements RcMap.RcMap<K, A, E> {
  readonly [TypeId]: RcMap.RcMap.Variance<K, A, E>

  state: State<K, A, E> = {
    _tag: "Open",
    map: MutableHashMap.empty()
  }
  readonly semaphore = circular.unsafeMakeSemaphore(1)

  constructor(
    readonly lookup: (key: K) => Effect<A, E, Scope.Scope>,
    readonly context: Context.Context<never>,
    readonly scope: Scope.Scope,
    readonly idleTimeToLive: Duration.Duration | undefined,
    readonly capacity: number
  ) {
    this[TypeId] = variance
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const make: {
  <K, A, E, R>(options: {
    readonly lookup: (key: K) => Effect<A, E, R>
    readonly idleTimeToLive?: Duration.DurationInput | undefined
    readonly capacity?: undefined
  }): Effect<RcMap.RcMap<K, A, E>, never, Scope.Scope | R>
  <K, A, E, R>(options: {
    readonly lookup: (key: K) => Effect<A, E, R>
    readonly idleTimeToLive?: Duration.DurationInput | undefined
    readonly capacity: number
  }): Effect<RcMap.RcMap<K, A, E | Cause.ExceededCapacityException>, never, Scope.Scope | R>
} = <K, A, E, R>(options: {
  readonly lookup: (key: K) => Effect<A, E, R>
  readonly idleTimeToLive?: Duration.DurationInput | undefined
  readonly capacity?: number | undefined
}) =>
  core.withFiberRuntime<RcMap.RcMap<K, A, E>, never, R | Scope.Scope>((fiber) => {
    const context = fiber.getFiberRef(core.currentContext) as Context.Context<R | Scope.Scope>
    const scope = Context.get(context, fiberRuntime.scopeTag)
    const self = new RcMapImpl<K, A, E>(
      options.lookup as any,
      context,
      scope,
      options.idleTimeToLive ? Duration.decode(options.idleTimeToLive) : undefined,
      Math.max(options.capacity ?? Number.POSITIVE_INFINITY, 0)
    )
    return core.as(
      scope.addFinalizer(() =>
        core.suspend(() => {
          if (self.state._tag === "Closed") {
            return core.void
          }
          const map = self.state.map
          self.state = { _tag: "Closed" }
          return core.forEachSequentialDiscard(
            map,
            ([, entry]) => core.scopeClose(entry.scope, core.exitVoid)
          ).pipe(
            core.tap(() => {
              MutableHashMap.clear(map)
            }),
            self.semaphore.withPermits(1)
          )
        })
      ),
      self
    )
  })

/** @internal */
export const get: {
  <K>(key: K): <A, E>(self: RcMap.RcMap<K, A, E>) => Effect<A, E, Scope.Scope>
  <K, A, E>(self: RcMap.RcMap<K, A, E>, key: K): Effect<A, E, Scope.Scope>
} = dual(
  2,
  <K, A, E>(self_: RcMap.RcMap<K, A, E>, key: K): Effect<A, E, Scope.Scope> => {
    const self = self_ as RcMapImpl<K, A, E>
    return core.uninterruptibleMask((restore) =>
      core.suspend(() => {
        if (self.state._tag === "Closed") {
          return core.interrupt
        }
        const state = self.state
        const o = MutableHashMap.get(state.map, key)
        if (o._tag === "Some") {
          const entry = o.value
          entry.refCount++
          return entry.fiber
            ? core.as(core.interruptFiber(entry.fiber), entry)
            : core.succeed(entry)
        } else if (Number.isFinite(self.capacity) && MutableHashMap.size(self.state.map) >= self.capacity) {
          return core.fail(
            new core.ExceededCapacityException(`RcMap attempted to exceed capacity of ${self.capacity}`)
          ) as Effect<never>
        }
        const acquire = self.lookup(key)
        return fiberRuntime.scopeMake().pipe(
          coreEffect.bindTo("scope"),
          coreEffect.bind("deferred", () => core.deferredMake<A, E>()),
          core.tap(({ deferred, scope }) =>
            restore(core.fiberRefLocally(
              acquire as Effect<A, E>,
              core.currentContext,
              Context.add(self.context, fiberRuntime.scopeTag, scope)
            )).pipe(
              core.exit,
              core.flatMap((exit) => core.deferredDone(deferred, exit)),
              circular.forkIn(scope)
            )
          ),
          core.map(({ deferred, scope }) => {
            const entry: State.Entry<A, E> = {
              deferred,
              scope,
              fiber: undefined,
              refCount: 1
            }
            MutableHashMap.set(state.map, key, entry)
            return entry
          })
        )
      }).pipe(
        self.semaphore.withPermits(1),
        coreEffect.bindTo("entry"),
        coreEffect.bind("scope", () => fiberRuntime.scopeTag),
        core.tap(({ entry, scope }) =>
          scope.addFinalizer(() =>
            core.suspend(() => {
              entry.refCount--
              if (entry.refCount > 0) {
                return core.void
              } else if (self.idleTimeToLive === undefined) {
                if (self.state._tag === "Open") {
                  MutableHashMap.remove(self.state.map, key)
                }
                return core.scopeClose(entry.scope, core.exitVoid)
              }
              return coreEffect.sleep(self.idleTimeToLive).pipe(
                core.interruptible,
                core.zipRight(core.suspend(() => {
                  if (self.state._tag === "Open" && entry.refCount === 0) {
                    MutableHashMap.remove(self.state.map, key)
                    return core.scopeClose(entry.scope, core.exitVoid)
                  }
                  return core.void
                })),
                fiberRuntime.ensuring(core.sync(() => {
                  entry.fiber = undefined
                })),
                circular.forkIn(self.scope),
                core.tap((fiber) => {
                  entry.fiber = fiber
                }),
                self.semaphore.withPermits(1)
              )
            })
          )
        ),
        core.flatMap(({ entry }) => restore(core.deferredAwait(entry.deferred)))
      )
    )
  }
)

/** @internal */
export const keys = <K, A, E>(self: RcMap.RcMap<K, A, E>): Effect<Array<K>> => {
  const impl = self as RcMapImpl<K, A, E>
  return core.suspend(() =>
    impl.state._tag === "Closed" ? core.interrupt : core.succeed(MutableHashMap.keys(impl.state.map))
  )
}
