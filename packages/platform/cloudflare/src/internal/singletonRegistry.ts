/** @internal */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

/** @internal */
export interface SingletonRegistration {
  readonly run: Effect.Effect<void, unknown, never>
  readonly context: Context.Context<never>
}

const registrations = new Map<string, SingletonRegistration>()

/** @internal */
export const getSingletonRegistration = (name: string): SingletonRegistration | undefined => registrations.get(name)

/** @internal */
export const registerSingleton = (name: string, registration: SingletonRegistration): boolean => {
  if (registrations.has(name)) return false
  registrations.set(name, registration)
  return true
}

/** @internal */
export const unregisterSingleton = (name: string, registration: SingletonRegistration): void => {
  if (registrations.get(name) === registration) registrations.delete(name)
}
