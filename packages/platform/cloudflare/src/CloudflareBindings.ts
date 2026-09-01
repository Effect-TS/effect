/**
 * Shared Cloudflare Worker binding names.
 *
 * @since 4.0.0
 */

/**
 * Canonical Worker binding names used by the Cloudflare cluster runtime.
 *
 * @category models
 * @since 4.0.0
 */
export const Names = {
  entity: "CLUSTER_ENTITY",
  workflow: "CLUSTER_WORKFLOW",
  queue: "CLUSTER_QUEUE",
  singleton: "CLUSTER_SINGLETON",
  singletonTriggers: "CLUSTER_SINGLETON_TRIGGERS"
} as const
