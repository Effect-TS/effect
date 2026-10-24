import * as Context from "../../Context.ts"

/**
 * When `true`, `FetchHttpClient` sends requests with `redirect: "manual"`,
 * over any `RequestInit` from the client layer or the call site. Unlike
 * providing a `RequestInit`, it keeps every other configured option.
 *
 * @internal
 */
export const ManualRedirect = Context.Reference<boolean>("effect/http/FetchHttpClient/ManualRedirect", {
  defaultValue: () => false
})
