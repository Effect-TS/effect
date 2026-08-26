/**
 * MIME type lookup used by `@effect/platform-node` file responses.
 *
 * @since 4.0.0
 */
import standardTypes from "./internal/mimeTypes.ts"

const extensionToType = new Map<string, string>()
const typeToExtension = new Map<string, string>()
const typeToExtensions = new Map<string, Set<string>>()

for (const [type, extensions] of Object.entries(standardTypes)) {
  const allExtensions = new Set<string>()
  typeToExtensions.set(type, allExtensions)
  for (let index = 0; index < extensions.length; index++) {
    let extension: string = extensions[index]
    const starred = extension.startsWith("*")
    if (starred) {
      extension = extension.slice(1)
    }
    allExtensions.add(extension)
    if (index === 0) {
      typeToExtension.set(type, extension)
    }
    if (!starred) {
      extensionToType.set(extension, type)
    }
  }
}

/**
 * Returns the standard MIME type associated with a file name or extension.
 *
 * @category utilities
 * @since 4.0.0
 */
export const getType = (path: string): string | null => {
  if (typeof path !== "string") {
    return null
  }
  const last = path.replace(/^.*[/\\]/s, "").toLowerCase()
  const extension = last.replace(/^.*\./s, "").toLowerCase()
  const hasPath = last.length < path.length
  const hasDot = extension.length < last.length - 1
  if (!hasDot && hasPath) {
    return null
  }
  return extensionToType.get(extension) ?? null
}

/**
 * Returns the default file extension associated with a standard MIME type.
 *
 * @category utilities
 * @since 4.0.0
 */
export const getExtension = (type: string): string | null => {
  if (typeof type !== "string") {
    return null
  }
  return typeToExtension.get(type.split(";")[0].trim().toLowerCase()) ?? null
}

/**
 * Returns every file extension associated with a standard MIME type.
 *
 * @category utilities
 * @since 4.0.0
 */
export const getAllExtensions = (type: string): Set<string> | null => {
  if (typeof type !== "string") {
    return null
  }
  return typeToExtensions.get(type.toLowerCase()) ?? null
}
