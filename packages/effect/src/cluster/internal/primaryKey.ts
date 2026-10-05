/**
 * Internal encoding of the storage primary key for keyed cluster requests.
 *
 * Persisted keys historically used the plain `entityType/entityId/tag/id`
 * form, which is ambiguous once a component contains `/`. To stay compatible
 * with stored keys, the plain form is still used for every tuple it can
 * represent unambiguously:
 *
 * - `entityId` and `tag` contain no `/`
 * - `entityType` contains no `/` (and is not `Workflow`), or is a
 *   `Workflow/<name>` type used by the cluster workflow engine where `<name>`
 *   contains no `/`
 *
 * Given those constraints a plain key decomposes in exactly one way, and the
 * trailing `id` may contain anything. Every other tuple is encoded without any
 * `/` by escaping `%`, `/`, and `:` in each component and joining them with
 * `:`. Plain keys always contain at least three `/`, so the two forms never
 * collide.
 */

const workflowPrefix = "Workflow/"

const isPlainEncodable = (entityType: string, entityId: string, tag: string): boolean =>
  !entityId.includes("/") &&
  !tag.includes("/") &&
  (entityType.startsWith(workflowPrefix)
    ? !entityType.slice(workflowPrefix.length).includes("/")
    : entityType !== "Workflow" && !entityType.includes("/"))

const escapeComponent = (value: string): string =>
  value.replace(/[%/:]/g, (char) => char === "%" ? "%25" : char === "/" ? "%2F" : "%3A")

const unescapeComponent = (value: string): string =>
  value.replace(/%(25|2F|3A)/g, (_, code) => code === "25" ? "%" : code === "2F" ? "/" : ":")

/** @internal */
export const make = (entityType: string, entityId: string, tag: string, id: string): string =>
  isPlainEncodable(entityType, entityId, tag)
    ? `${entityType}/${entityId}/${tag}/${id}`
    : `${escapeComponent(entityType)}:${escapeComponent(entityId)}:${escapeComponent(tag)}:${escapeComponent(id)}`

/**
 * Decodes a key produced by `make` into the tuple it identifies, together with
 * the plain key that versions without escaping wrote for the same tuple (the
 * key itself when it is already plain). A row stored under a plain key may
 * belong to a different tuple written by those versions, so storage drivers
 * verify the row's entity type, entity id, and tag against the decoded tuple.
 *
 * @internal
 */
export const decode = (primaryKey: string): {
  readonly entityType: string
  readonly entityId: string
  readonly tag: string
  readonly legacyKey: string
} | undefined => {
  if (!primaryKey.includes("/")) {
    const parts = primaryKey.split(":")
    if (parts.length !== 4) return undefined
    const [entityType, entityId, tag, id] = parts.map(unescapeComponent)
    return { entityType, entityId, tag, legacyKey: `${entityType}/${entityId}/${tag}/${id}` }
  }
  const parts = primaryKey.split("/")
  const offset = parts[0] === "Workflow" ? 1 : 0
  if (parts.length < 4 + offset) return undefined
  return {
    entityType: offset === 0 ? parts[0] : `${workflowPrefix}${parts[1]}`,
    entityId: parts[1 + offset],
    tag: parts[2 + offset],
    legacyKey: primaryKey
  }
}
