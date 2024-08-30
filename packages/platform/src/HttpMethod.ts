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
