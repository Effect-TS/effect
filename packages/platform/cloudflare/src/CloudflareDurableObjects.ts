/**
 * The Durable Object classes behind `CloudflareCluster.layer`.
 *
 * A Worker using the Cloudflare cluster re-exports these four classes from its
 * entry module and binds each one in `wrangler.jsonc` as a SQLite-backed
 * Durable Object class. The cluster resolves objects through the same-Worker
 * namespace bindings only; none of these classes serve a public route, and any
 * direct `fetch` of an object is rejected.
 *
 * @since 4.0.0
 */
import { DurableObject } from "cloudflare:workers"
import { ensureEntityStorage, rearmAlarm } from "./internal/entityStorage.ts"

const notExposed = (className: string) => () => {
  throw new Error(
    `@effect/platform-cloudflare: ${className} is not exposed over fetch, use the same-Worker namespace binding`
  )
}

/**
 * The shared entity class. One instance holds one entity address; the handlers
 * for every `EntityType` are registered at Worker init.
 *
 * **Details**
 *
 * The constructor stays cheap: it opens SQLite, ensures the mailbox tables,
 * and re-arms the single alarm from the earliest pending `deliver_at`. User
 * handlers are never built in the constructor; they are built once per wake.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterEntity extends DurableObject<unknown> {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env)
    ensureEntityStorage(ctx.storage.sql)
    void ctx.blockConcurrencyWhile(() => rearmAlarm(ctx.storage, ctx.storage.sql))
  }

  override fetch: () => never = notExposed("ClusterEntity")
}

/**
 * The workflow execution class. Placeholder for the Cloudflare workflow
 * engine; it only reserves the binding for now.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterWorkflow extends DurableObject<unknown> {
  override fetch: () => never = notExposed("ClusterWorkflow")
}

/**
 * The durable queue class. Placeholder for `DurableQueue`; one object per
 * queue name. It only reserves the binding for now.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterDurableQueue extends DurableObject<unknown> {
  override fetch: () => never = notExposed("ClusterDurableQueue")
}

/**
 * The singleton class. Placeholder for `Singleton`; one object per singleton
 * name, woken by a Worker Cron Trigger. It only reserves the binding for now.
 *
 * @category durable objects
 * @since 4.0.0
 */
export class ClusterSingleton extends DurableObject<unknown> {
  override fetch: () => never = notExposed("ClusterSingleton")
}
