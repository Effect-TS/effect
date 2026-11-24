import { RegistryContext } from "@effect/atom-solid"
import type { AtomRegistry } from "effect/reactivity"
import { createComponent, createEffect, type Element } from "solid-js"

/** Runs `f` with the value of `read` now and whenever it changes. */
export const watch = <A>(read: () => A, f: (value: A) => void): void => {
  // The effect function's return value is its cleanup, so discard `f`'s.
  createEffect(read, (value) => {
    f(value)
  })
}

/** Renders `children` under a provider for `registry`. */
export const provideRegistry = (registry: AtomRegistry.AtomRegistry, children: () => Element): void => {
  const element = createComponent(RegistryContext, {
    value: registry,
    get children() {
      return children()
    }
  })
  // Providers resolve children lazily and keep them alive only while something
  // observes them, as the renderer does once they are inserted.
  if (typeof element === "function") {
    watch(element, () => {})
  }
}
