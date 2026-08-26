/**
 * MIME type lookup used by `@effect/platform-node` file responses.
 *
 * @since 4.0.0
 */

import standardTypes from "./internal/mimeTypes.ts"

/**
 * A map from MIME types to their associated file extensions.
 *
 * @category models
 * @since 4.0.0
 */
export interface TypeMap {
  readonly [type: string]: ReadonlyArray<string>
}

/**
 * A MIME type registry.
 *
 * @category constructors
 * @since 4.0.0
 */
export class Mime {
  readonly #extensionToType = new Map<string, string>()
  readonly #typeToExtension = new Map<string, string>()
  readonly #typeToExtensions = new Map<string, Set<string>>()

  constructor(...typeMaps: ReadonlyArray<TypeMap>) {
    for (const typeMap of typeMaps) {
      this.define(typeMap)
    }
  }

  /**
   * Adds MIME type mappings to this registry.
   *
   * @since 4.0.0
   */
  define(typeMap: TypeMap, force = false): this {
    for (const [rawType, rawExtensions] of Object.entries(typeMap)) {
      const type = rawType.toLowerCase()
      const extensions = rawExtensions.map((extension) => extension.toLowerCase())
      let allExtensions = this.#typeToExtensions.get(type)
      if (allExtensions === undefined) {
        allExtensions = new Set()
        this.#typeToExtensions.set(type, allExtensions)
      }

      for (let index = 0; index < extensions.length; index++) {
        let extension = extensions[index]
        const starred = extension.startsWith("*")
        if (starred) {
          extension = extension.slice(1)
        }
        allExtensions.add(extension)
        if (index === 0) {
          this.#typeToExtension.set(type, extension)
        }
        if (starred) {
          continue
        }

        const currentType = this.#extensionToType.get(extension)
        if (currentType !== undefined && currentType !== type && !force) {
          throw new Error(
            `"${type} -> ${extension}" conflicts with "${currentType} -> ${extension}". Pass \`force=true\` to override this definition.`
          )
        }
        this.#extensionToType.set(extension, type)
      }
    }
    return this
  }

  /**
   * Returns the MIME type associated with a file name or extension.
   *
   * @since 4.0.0
   */
  getType(path: string): string | null {
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
    return this.#extensionToType.get(extension) ?? null
  }

  /**
   * Returns the default extension associated with a MIME type.
   *
   * @since 4.0.0
   */
  getExtension(type: string): string | null {
    if (typeof type !== "string") {
      return null
    }
    return this.#typeToExtension.get(type.split(";")[0].trim().toLowerCase()) ?? null
  }

  /**
   * Returns every extension associated with a MIME type.
   *
   * @since 4.0.0
   */
  getAllExtensions(type: string): Set<string> | null {
    if (typeof type !== "string") {
      return null
    }
    return this.#typeToExtensions.get(type.toLowerCase()) ?? null
  }

  /** @internal */
  _freeze(): this {
    this.define = () => {
      throw new Error(
        "define() not allowed for built-in Mime objects. See https://github.com/broofa/mime/blob/main/README.md#custom-mime-instances"
      )
    }
    Object.freeze(this)
    for (const extensions of this.#typeToExtensions.values()) {
      Object.freeze(extensions)
    }
    return this
  }

  /** @internal */
  _getTestState(): { readonly types: Map<string, string>; readonly extensions: Map<string, string> } {
    return {
      types: this.#extensionToType,
      extensions: this.#typeToExtension
    }
  }
}

const mime = new Mime(standardTypes)._freeze()

/**
 * Returns the standard MIME type associated with a file name or extension.
 *
 * @category utilities
 * @since 4.0.0
 */
export const getType = (path: string): string | null => mime.getType(path)

/**
 * Returns the default file extension associated with a standard MIME type.
 *
 * @category utilities
 * @since 4.0.0
 */
export const getExtension = (type: string): string | null => mime.getExtension(type)

/**
 * Returns every file extension associated with a standard MIME type.
 *
 * @category utilities
 * @since 4.0.0
 */
export const getAllExtensions = (type: string): Set<string> | null => mime.getAllExtensions(type)

/**
 * The built-in MIME type registry used by `NodeHttpPlatform`.
 *
 * @deprecated Use the top-level functions in this module.
 *
 * @since 4.0.0
 */
export default mime
