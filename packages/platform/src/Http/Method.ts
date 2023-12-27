/**
 * @since 1.0.0
 * @category models
 */
export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

/**
 * @since 1.0.0
 */
export const hasBody = (method: Method): boolean => method !== "GET" && method !== "HEAD"
