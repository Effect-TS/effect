import { RegistryContext } from "@effect/atom-solid"
import type { AtomRegistry } from "effect/reactivity"
import * as Solid from "solid-js"

/**
 * The suite runs against Solid 1 and Solid 2 (see the
 * "@effect/atom-solid (solid 2)" vitest project). These helpers paper over the
 * test-side API differences between the two major versions.
 */
export const isSolid2 = !("Provider" in RegistryContext)

/** Runs `f` with the value of `read` now and whenever it changes. */
export const watch = <A>(read: () => A, f: (value: A) => void): void => {
  if (isSolid2) {
    ;(Solid.createEffect as any)(read, (value: A) => {
      f(value)
    })
  } else {
    Solid.createEffect(() => f(read()))
  }
}

/** Applies queued Solid 2 updates. Solid 1 applies them synchronously. */
export const flush = (): void => {
  if (isSolid2) {
    ;(Solid as any).flush()
  }
}

/** Renders `children` under a provider for `registry`. */
export const provideRegistry = (registry: AtomRegistry.AtomRegistry, children: () => unknown): void => {
  const element: unknown = Solid.createComponent(isSolid2 ? RegistryContext as any : RegistryContext.Provider, {
    value: registry,
    get children() {
      return children() as any
    }
  })
  // Solid 2 providers resolve children lazily and keep them alive only while
  // something observes them, as the renderer does once they are inserted.
  if (typeof element === "function") {
    watch(element as () => unknown, () => {})
  }
}
