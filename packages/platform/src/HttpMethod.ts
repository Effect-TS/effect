/**
 * @since 1.0.0
 * @category models
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpMethod {
  /**
   * @since 1.0.0
   * @category models
   */
  export type NoBody = "GET" | "HEAD" | "OPTIONS"

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithBody = Exclude<HttpMethod, NoBody>
}

/**
 * @since 1.0.0
 */
export const hasBody = (method: HttpMethod): boolean => method !== "GET" && method !== "HEAD" && method !== "OPTIONS"

/**
 * @since 1.0.0
 */
export const all: ReadonlySet<HttpMethod> = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])

/**
 * Tests if a value is a `HttpMethod`.
 *
 * **Example**
 *
 * ```ts
 * import { HttpMethod } from "@effect/platform"
 *
 * console.log(HttpMethod.isHttpMethod("GET"))
 * // true
 * console.log(HttpMethod.isHttpMethod("get"))
 * // false
 * console.log(HttpMethod.isHttpMethod(1))
 * // false
 * ```
 *
 * @since 1.0.0
 * @category refinements
 */
export const isHttpMethod = (u: unknown): u is HttpMethod => all.has(u as HttpMethod)
