/**
 * Runs Effect Cluster entities on Cloudflare Durable Objects.
 *
 * On this path every entity instance is one Durable Object: the Worker encodes
 * an `(entityType, entityId)` address into a Durable Object name, resolves the
 * object stub with `getByName`, and the object's SQLite storage is the system
 * of record. There is no shard routing, no runner fleet, and no external
 * message storage; `layer` provides the cluster `Sharding` service on top of
 * the Durable Object namespace bindings instead of `Sharding.layer`.
 *
 * @since 4.0.0
 */
import * as Internal from "./internal/clusterName.ts"

/**
 * A Durable Object name decoded back into its entity address parts.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterName {
  readonly type: string
  readonly id: string
}

/**
 * Encodes an entity address into the Durable Object name used with
 * `getByName`.
 *
 * **Details**
 *
 * The name is the entity type length-prefixed as `` `${type.length}:${type}${id}` ``,
 * which keeps `(type, id)` pairs collision-free without restricting the
 * characters an entity id may contain. Workflow, queue, and singleton names use
 * the same scheme on their own namespaces.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeName: (type: string, id: string) => string = Internal.encodeName

/**
 * Decodes a Durable Object name produced by {@link encodeName} back into its
 * entity address parts.
 *
 * **Details**
 *
 * Returns `undefined` for names that were not produced by {@link encodeName},
 * including non-canonical length prefixes. A Durable Object uses this to
 * recover its own address from `ctx.id.name`.
 *
 * @category encoding
 * @since 4.0.0
 */
export const decodeName: (name: string) => ClusterName | undefined = Internal.decodeName
