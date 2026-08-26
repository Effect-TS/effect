/**
 * MIME type lookup used by `@effect/platform-node` file responses.
 *
 * @since 4.0.0
 */

type TypeMap = { readonly [type: string]: ReadonlyArray<string> }

const types: TypeMap = {
  "application/gzip": ["gz"],
  "application/json": ["json", "map"],
  "application/manifest+json": ["webmanifest"],
  "application/octet-stream": ["bin"],
  "application/pdf": ["pdf"],
  "application/vnd.ms-fontobject": ["eot"],
  "application/wasm": ["wasm"],
  "application/xml": ["xml"],
  "application/zip": ["zip"],
  "audio/aac": ["aac"],
  "audio/mpeg": ["mp3"],
  "audio/ogg": ["oga", "ogg", "spx", "opus"],
  "audio/wav": ["wav"],
  "audio/x-flac": ["flac"],
  "font/otf": ["otf"],
  "font/ttf": ["ttf"],
  "font/woff": ["woff"],
  "font/woff2": ["woff2"],
  "image/avif": ["avif"],
  "image/bmp": ["bmp"],
  "image/gif": ["gif"],
  "image/jpeg": ["jpg", "jpeg", "jpe"],
  "image/png": ["png"],
  "image/svg+xml": ["svg", "svgz"],
  "image/tiff": ["tif", "tiff"],
  "image/vnd.microsoft.icon": ["ico"],
  "image/webp": ["webp"],
  "text/css": ["css"],
  "text/csv": ["csv"],
  "text/html": ["html", "htm", "shtml"],
  "text/javascript": ["js", "mjs"],
  "text/markdown": ["md", "markdown"],
  "text/plain": ["txt", "text", "conf", "def", "list", "log", "in", "ini"],
  "text/yaml": ["yaml", "yml"],
  "video/mp4": ["mp4"],
  "video/quicktime": ["mov"],
  "video/webm": ["webm"],
  "video/x-m4v": ["m4v"]
}

/**
 * A MIME type registry.
 *
 * @deprecated Use a dedicated MIME package when comprehensive MIME mappings
 * are required. The built-in registry only contains types used for common
 * static files served by `NodeHttpPlatform`.
 *
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

const mime = new Mime(types)._freeze()

/**
 * The built-in MIME type registry used by `NodeHttpPlatform`.
 *
 * @deprecated Use a dedicated MIME package when comprehensive MIME mappings
 * are required.
 *
 * @since 4.0.0
 */
export default mime
