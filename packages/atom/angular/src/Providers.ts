/**
 * Angular dependency-injection wiring for the `AtomRegistry` that the stores and
 * injection functions read from. The registry holds atom values, schedules
 * update work, and cleans up unused atoms; sharing one through Angular DI is
 * what lets components, directives, and services in the same injector tree read
 * and write the same atom state.
 *
 * The registry token is `providedIn: "root"`, so a registry exists without any
 * setup. `provideAtomRegistry` replaces it for an injector scope, and
 * `REGISTRY_OPTIONS` configures the one that is created by default.
 *
 * @since 4.0.0
 */
import type { Provider } from "@angular/core"
import { DestroyRef, inject, InjectionToken } from "@angular/core"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"

import type { RegistryOptions } from "./Types.ts"

/**
 * Injection token carrying the options a default registry is created with.
 *
 * **When to use**
 *
 * Use to configure the registry that {@link ATOM_REGISTRY} creates on first use
 * without replacing the token itself: provide it in
 * `ApplicationConfig.providers` and the root registry picks it up.
 *
 * **Details**
 *
 * The token is optional. When nothing provides it, the registry is created with
 * `AtomRegistry.make` defaults. {@link provideAtomRegistry} provides it too, so
 * the options a scope was configured with stay readable through
 * {@link injectRegistryOptions}.
 *
 * @see {@link ATOM_REGISTRY} for the registry these options configure
 *
 * @category context
 * @since 4.0.0
 */
export const REGISTRY_OPTIONS: InjectionToken<RegistryOptions> = new InjectionToken<RegistryOptions>(
  "@effect/atom-angular:REGISTRY_OPTIONS"
)

/**
 * Returns the registry options provided for the current Angular injector, or
 * `null` when none were provided.
 *
 * **When to use**
 *
 * Use when building a registry by hand and the surrounding scope's configured
 * options should be honoured.
 *
 * **Gotchas**
 *
 * Must be called from an injection context, such as a constructor or a field
 * initializer.
 *
 * @see {@link REGISTRY_OPTIONS} for the token this reads
 *
 * @category context
 * @since 4.0.0
 */
export const injectRegistryOptions = (): RegistryOptions | null => inject(REGISTRY_OPTIONS, { optional: true })

// Creates a registry bound to the current injector; needs an injection context
const makeScopedRegistry = (options?: RegistryOptions): AtomRegistry.AtomRegistry => {
  const registry = AtomRegistry.make(options ?? injectRegistryOptions() ?? undefined)
  inject(DestroyRef).onDestroy(() => registry.dispose())
  return registry
}

/**
 * Injection token carrying the `AtomRegistry` every store shares by default.
 *
 * **When to use**
 *
 * Use when you need to read or provide the registry through lower-level Angular
 * DI APIs instead of {@link injectAtomRegistry} or {@link provideAtomRegistry}.
 *
 * **Details**
 *
 * The token is tree-shakable and `providedIn: "root"`. When no explicit provider
 * is present, a registry is created on first use from {@link REGISTRY_OPTIONS}
 * and disposed when the injector that created it is destroyed. Atoms form a
 * dependency graph and that graph lives in a registry, so one registry per
 * injector scope is the intended model: two registries mean two independent
 * copies of the same atoms, and stores built over related atoms would not see
 * each other's writes.
 *
 * @see {@link provideAtomRegistry} for scoping a registry to an injector
 *
 * @category context
 * @since 4.0.0
 */
export const ATOM_REGISTRY: InjectionToken<AtomRegistry.AtomRegistry> = new InjectionToken<
  AtomRegistry.AtomRegistry
>("@effect/atom-angular:ATOM_REGISTRY", {
  providedIn: "root",
  factory: () => makeScopedRegistry()
})

/**
 * Returns the `AtomRegistry` visible to the current Angular injector.
 *
 * **When to use**
 *
 * Use when a component or service needs the registry directly, for example to
 * read, set, or refresh an atom outside the store and the injection functions,
 * or to end a subscription earlier than the injector does.
 *
 * **Gotchas**
 *
 * Must be called from an injection context, such as a constructor or a field
 * initializer.
 *
 * @see {@link ATOM_REGISTRY} for the token this reads
 *
 * @category context
 * @since 4.0.0
 */
export const injectAtomRegistry = (): AtomRegistry.AtomRegistry => inject(ATOM_REGISTRY)

/**
 * Provides an `AtomRegistry` for an Angular injector, configured with the given
 * registry options.
 *
 * **When to use**
 *
 * Use to scope atom state, scheduling, and idle cleanup to an application, a
 * lazily loaded route, or a single component subtree.
 *
 * **Details**
 *
 * Returns providers for both {@link REGISTRY_OPTIONS} and {@link ATOM_REGISTRY},
 * so the options stay readable from the same scope. In
 * `ApplicationConfig.providers` this configures the application-wide registry;
 * in a component's or a route's `providers` it creates a child registry for that
 * injector, disposed when that injector is destroyed.
 *
 * **Gotchas**
 *
 * Options are read once, when the registry is created; changing them afterwards
 * has no effect. A component-level provider creates one registry per component
 * instance, which isolates that component from atom state held elsewhere.
 * Leaving `defaultIdleTTL` unset means unused atoms are never swept, which is the
 * `AtomRegistry.make` default.
 *
 * @see {@link ATOM_REGISTRY} for the token this provides
 * @see {@link injectAtomRegistry} for reading the resulting registry
 *
 * @category context
 * @since 4.0.0
 */
export const provideAtomRegistry = (options: RegistryOptions = {}): Array<Provider> => [
  { provide: REGISTRY_OPTIONS, useValue: options },
  { provide: ATOM_REGISTRY, useFactory: () => makeScopedRegistry(options) }
]
