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
 * Tests if a value is a `HttpMethod`.
 *
 * @param input - The value to test.
 *
 * @example
 * ```ts
 * import { HttpMethod } from "@effect/platform"
 *
 * assert.deepStrictEqual(HttpMethod.isHttpMethod("GET"), true)
 * assert.deepStrictEqual(HttpMethod.isHttpMethod("get"), false)
 * assert.deepStrictEqual(HttpMethod.isHttpMethod(1), false)
 * ```
 *
 * @since 1.0.0
 * @category refinements
 */
export const isHttpMethod = (u: unknown): u is HttpMethod =>
  typeof u === "string" && ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(u)
