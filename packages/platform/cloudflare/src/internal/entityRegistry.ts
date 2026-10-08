/** @internal */
import type * as Entity from "effect/cluster/Entity"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import { makeRegistry } from "./registry.ts"

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
  /** Interval of the keep-alive heartbeat alarm, in milliseconds. */
  readonly keepAliveHeartbeat?: number | undefined
}

const registry = makeRegistry<EntityRegistration>()

/** @internal */
export const getEntityRegistration: (type: string) => EntityRegistration | undefined = registry.get

/** @internal */
export const registerEntity: (type: string, registration: EntityRegistration) => boolean = registry.register

/** @internal */
export const unregisterEntity: (type: string, registration: EntityRegistration) => void = registry.unregister
