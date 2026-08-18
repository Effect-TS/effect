/** @internal */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Entity from "effect/unstable/cluster/Entity"

export interface EntityRegistration {
  readonly entity: Entity.Entity<any, any>
  readonly build: Effect.Effect<Record<string, (request: any) => any>, never, never>
  readonly options: {
    readonly concurrency?: number | "unbounded" | undefined
    readonly disableFatalDefects?: boolean | undefined
    readonly defectRetryPolicy?: unknown
    readonly spanAttributes?: Record<string, string> | undefined
  } | undefined
  readonly context: Context.Context<never>
}

const registrations = new Map<string, EntityRegistration>()

/** @internal */
export const getEntityRegistration = (type: string): EntityRegistration | undefined => registrations.get(type)

/** @internal */
export const registerEntity = (type: string, registration: EntityRegistration): boolean => {
  if (registrations.has(type)) return false
  registrations.set(type, registration)
  return true
}

/** @internal */
export const unregisterEntity = (type: string, registration: EntityRegistration): void => {
  if (registrations.get(type) === registration) registrations.delete(type)
}
