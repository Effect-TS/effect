import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import type * as AtomRegistry from "effect/reactivity/AtomRegistry"

import type { AuthAtomLifetime, AuthSubjectLifetime } from "./authAtomLifetime.ts"

/**
 * Notify before disposing the old registry. Publish lifetime.current only after
 * current() returns the replacement registry. Closing may omit replacement.
 *
 * @internal
 */
export interface AccountBinding {
  readonly lifetime: AuthAtomLifetime["Service"]
  readonly current: () => AuthSubjectLifetime
  readonly subscribe: (listener: (event: { readonly origin?: object }) => void) => () => void
}

type RuntimeValue = AsyncResult.AsyncResult<unknown, unknown>
type RuntimeAtom = Atom.Atom<RuntimeValue>
type RuntimeWritable = Atom.Writable<RuntimeValue, unknown>

interface ProxyState {
  current?: AuthSubjectLifetime
  retired: boolean
  pending: boolean
  command?: { readonly value: unknown; readonly generation?: number } | undefined
  terminal?: RuntimeValue | undefined
  retirementLimit?: object | undefined
}

/**
 * Borrow the host Context while assigning each computation to the current
 * account registry. The returned atoms remain stable in ordinary app registries;
 * calls from another account atom read their underlying source directly.
 *
 * @internal
 */
export const makeScopedRuntime = <R, ER>(
  hostRuntime: Atom.AtomRuntime<R, ER>,
  getBinding: (services: Context.Context<R>) => AccountBinding
): Atom.AtomRuntime<R, ER> => {
  const contexts = new WeakMap<AtomRegistry.AtomRegistry, Context.Context<R>>()
  const registryAtom = Atom.make((get) => get.registry)
  const runtime = Object.create(hostRuntime) as Atom.AtomRuntime<R, ER>

  const wrap = (source: RuntimeAtom, mutation: boolean): RuntimeAtom => {
    // Keep queued inputs in a registry-owned node, so unmounting the proxy can
    // release them even while the application's outer registry remains alive.
    const stateAtom = Atom.make((): ProxyState => ({ retired: false, pending: false }))
    const refreshState = Atom.make((): { token?: object } => ({}))
    const refreshSignal = Atom.make(() => ({}))

    const refreshSource = (
      get: Atom.AtomContext,
      registry: AtomRegistry.AtomRegistry,
      beforeRefresh?: () => void
    ) => {
      const token = get(refreshSignal)
      const refreshed = get(refreshState)
      const previous = refreshed.token

      refreshed.token = token
      if (previous !== undefined && previous !== token) {
        beforeRefresh?.()
        registry.refresh(source)
      }
    }

    const read = (get: Atom.AtomContext): RuntimeValue => {
      if (contexts.has(get.registry)) {
        refreshSource(get, get.registry)

        return get(source)
      }

      const state = get(stateAtom)
      const refreshToken = get(refreshSignal)

      if (state.retirementLimit !== undefined && state.retirementLimit !== refreshToken) {
        state.retirementLimit = undefined
        state.terminal = undefined
      }
      const host = get(hostRuntime)

      if (host._tag !== "Success") {
        return host._tag === "Failure"
          ? AsyncResult.failure(host.cause)
          : (state.terminal ?? AsyncResult.initial(host.waiting))
      }

      const binding = getBinding(host.value)
      let evaluating = true
      let replacements = 0

      get.addFinalizer(
        binding.subscribe(() => {
          state.retired = true
          state.terminal = mutation && state.pending ? AsyncResult.failure(Cause.interrupt()) : state.terminal
          state.command = undefined
          state.pending = false
          // Never retain an old account value as AsyncResult.previous.
          // Publishing during a read would let the current-state notification
          // dispose that read before it can attach to the replacement registry.
          if (!evaluating) get.setSelf(state.terminal ?? AsyncResult.initial(true))
        })
      )

      try {
        while (true) {
          const current = get(binding.lifetime.current)

          contexts.set(current.registry, host.value)
          if (state.current?.registry !== current.registry) {
            state.current = current
            state.retired = false
          }

          if (state.terminal !== undefined) return state.terminal
          if (state.retired) return AsyncResult.initial(true)

          const unsubscribe = current.registry.subscribe(source, (value) => {
            if (state.retired || binding.current().registry !== current.registry) return
            state.pending = value.waiting
            if (!evaluating) get.setSelf(value)
          })

          get.addFinalizer(unsubscribe)

          const command = state.command

          if (command !== undefined) {
            // Consume before dispatch: a synchronous completion can retire this
            // registry before set returns. Retrying a read never repeats input.
            state.command = undefined
            if (command.generation !== undefined && command.generation !== current.generation) {
              state.pending = false
              state.terminal = AsyncResult.failure(Cause.interrupt())

              return state.terminal
            }
            current.registry.set(source as RuntimeWritable, command.value)
          }

          if (!state.retired) {
            refreshSource(get, current.registry, () => {
              state.pending = mutation
            })
          }

          if (!state.retired && binding.current().registry === current.registry) {
            const value = current.registry.get(source)

            // A synchronous source can dispose its own node before get returns.
            if (!state.retired && binding.current().registry === current.registry) {
              state.pending = value.waiting

              return value
            }
          }

          unsubscribe()
          if (state.terminal !== undefined) return state.terminal
          if (binding.current().registry === current.registry) return AsyncResult.initial(true)
          if (++replacements > 1) {
            // A custom query that changes account on every read must not spin.
            // Hold interruption until refresh instead of scheduling retries.
            state.terminal = AsyncResult.failure(Cause.interrupt())
            state.retirementLimit = refreshToken

            return state.terminal
          }
          // Account publication occurred while this read was building. Attach
          // directly to the new registry instead of losing that invalidation.
        }
      } finally {
        evaluating = false
      }
    }

    const refresh = (refreshAtom: <A>(atom: Atom.Atom<A>) => void) => refreshAtom(refreshSignal)

    if (!Atom.isWritable(source)) {
      return Atom.readable(read, refresh).pipe(Atom.withServerValueInitial)
    }

    return Atom.writable(
      read,
      (ctx, value: unknown) => {
        const registry = ctx.get(registryAtom)

        if (contexts.has(registry)) {
          ctx.set(source, value)

          return
        }

        const state = ctx.get(stateAtom)
        const host = ctx.get(hostRuntime)

        if (host._tag === "Success") {
          const current = getBinding(host.value).current()

          if (state.current?.registry !== current.registry) {
            state.current = current
            state.retired = false
          }
        }
        if (mutation && (value === Atom.Reset || value === Atom.Interrupt)) {
          state.command = undefined
          state.pending = false
          state.terminal = value === Atom.Interrupt ? AsyncResult.failure(Cause.interrupt()) : undefined
          if (state.current !== undefined && !state.retired) {
            state.current.registry.set(source, value)
          }
          ctx.refreshSelf()

          return
        }

        state.terminal = undefined
        state.retirementLimit = undefined
        state.pending = true
        state.command = {
          value,
          ...(state.current === undefined ? {} : { generation: state.current.generation })
        }
        ctx.refreshSelf()
      },
      refresh
    ).pipe(Atom.withServerValueInitial)
  }

  // Native runtime constructors preserve their overloads and execute with this
  // borrowed runtime. Only their heterogeneous argument/result plumbing is
  // erased here; the returned public runtime keeps the original R and ER.
  const invoke = (
    method: "atom" | "fn" | "pull" | "subscriptionRef",
    args: ReadonlyArray<unknown>
  ) => wrap(Reflect.apply(hostRuntime[method], runtime, args) as RuntimeAtom, method === "fn")

  Object.assign(runtime, {
    read: (get: Atom.AtomContext) => {
      const services = contexts.get(get.registry)

      return services === undefined ? get(hostRuntime) : AsyncResult.success(services)
    },
    atom: (...args: ReadonlyArray<unknown>) => invoke("atom", args),
    fn: (...args: ReadonlyArray<unknown>) =>
      args.length === 0
        ? (...inner: ReadonlyArray<unknown>) => invoke("fn", inner)
        : invoke("fn", args),
    pull: (...args: ReadonlyArray<unknown>) => invoke("pull", args),
    subscriptionRef: (...args: ReadonlyArray<unknown>) => invoke("subscriptionRef", args)
  })

  return runtime
}
