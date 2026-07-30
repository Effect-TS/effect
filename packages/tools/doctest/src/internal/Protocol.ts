export const collectorPrefix = "virtual:effect-doctest/collector?"
export const examplePrefix = "virtual:effect-doctest/example?"
export const resolvedMarker = "effect-doctest"

export interface Request {
  readonly file: string
  readonly index?: number | undefined
  readonly version?: string | undefined
}

export const request = (prefix: string, id: string): Request | undefined => {
  if (!id.startsWith(prefix)) return undefined
  const parameters = new URLSearchParams(id.slice(prefix.length))
  const file = parameters.get("file")
  const index = parameters.get("index")
  const version = parameters.get("version")
  if (file === null || (index !== null && !/^\d+$/.test(index))) return undefined
  return {
    file,
    index: index === null ? undefined : Number(index),
    version: version === null ? undefined : version
  }
}

export const resolvedRequest = (
  id: string
): (Request & { readonly kind: "collector" | "example" }) | undefined => {
  const query = id.indexOf("?")
  if (query === -1) return undefined
  const parameters = new URLSearchParams(id.slice(query + 1))
  const kind = parameters.get(resolvedMarker)
  if (kind !== "collector" && kind !== "example") return undefined
  const index = parameters.get("index")
  const version = parameters.get("version")
  if (kind === "example" && (index === null || !/^\d+$/.test(index))) return undefined
  return {
    file: id.slice(0, query),
    index: index === null ? undefined : Number(index),
    version: version === null ? undefined : version,
    kind
  }
}

export const resolvedId = (kind: "collector" | "example", value: Request): string => {
  const parameters = new URLSearchParams({ [resolvedMarker]: kind })
  if (value.index !== undefined) parameters.set("index", String(value.index))
  if (value.version !== undefined) parameters.set("version", value.version)
  return `${value.file}?${parameters}`
}

export const collectorId = (file: string, version?: string | undefined): string => {
  const parameters = new URLSearchParams({ file })
  if (version !== undefined) parameters.set("version", version)
  return `${collectorPrefix}${parameters}`
}

export const exampleId = (file: string, index: number, version?: string | undefined): string => {
  const parameters = new URLSearchParams({ file, index: String(index) })
  if (version !== undefined) parameters.set("version", version)
  return `${examplePrefix}${parameters}`
}
