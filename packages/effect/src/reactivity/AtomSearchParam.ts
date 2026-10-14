/**
 * Atoms that read and write one URL search parameter.
 *
 * `searchParam` keeps an atom aligned with `window.location.search`. A schema,
 * when supplied, decodes the parameter string and encodes writes back to it.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Exit from "../Exit.ts"
import * as Option from "../Option.ts"
import * as Schema from "../Schema.ts"
import { type Writable, writable } from "./Atom.ts"

/**
 * Creates an atom that reads and writes a URL search parameter.
 *
 * **Gotchas**
 *
 * If you pass a schema, it has to be synchronous and have no context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const searchParam = <S extends Schema.ConstraintCodec<any, string> = never>(
  name: string,
  options?: {
    readonly schema?: S | undefined
  }
): Writable<[S] extends [never] ? string : Option.Option<S["Type"]>> => {
  const decode = options?.schema && Schema.decodeExit(options.schema)
  const encode = options?.schema && Schema.encodeExit(options.schema)
  return writable(
    (get) => {
      if (typeof window === "undefined") {
        return decode ? Option.none() : ""
      }
      const handleUpdate = () => {
        if (searchParamState.updating) return
        const searchParams = new URLSearchParams(window.location.search)
        const newValue = searchParams.get(name) || ""
        if (decode) {
          get.setSelf(Exit.getSuccess(decode(newValue)))
        } else if (newValue !== Option.getOrUndefined(get.self())) {
          get.setSelf(newValue)
        }
      }
      window.addEventListener("popstate", handleUpdate)
      window.addEventListener("pushstate", handleUpdate)
      get.addFinalizer(() => {
        window.removeEventListener("popstate", handleUpdate)
        window.removeEventListener("pushstate", handleUpdate)
      })
      const value = new URLSearchParams(window.location.search).get(name) || ""
      return decode ? Exit.getSuccess(decode(value)) : value as any
    },
    (ctx, value: any) => {
      if (typeof window === "undefined") {
        ctx.setSelf(value)
        return
      }

      if (encode) {
        const encoded = Option.flatMap(value, (v) => Exit.getSuccess(encode(v as S["Type"])))
        searchParamState.updates.set(name, Option.getOrElse(encoded, () => ""))
        value = Option.zipRight(encoded, value)
      } else {
        searchParamState.updates.set(name, value)
      }
      ctx.setSelf(value)
      if (searchParamState.timeout) {
        clearTimeout(searchParamState.timeout)
      }
      searchParamState.timeout = setTimeout(updateSearchParams, 500) as any
    }
  )
}

const searchParamState = {
  timeout: undefined as number | undefined,
  updates: new Map<string, string>(),
  updating: false
}

function updateSearchParams() {
  searchParamState.timeout = undefined
  searchParamState.updating = true
  const searchParams = new URLSearchParams(window.location.search)
  for (const [key, value] of searchParamState.updates.entries()) {
    if (value.length > 0) {
      searchParams.set(key, value)
    } else {
      searchParams.delete(key)
    }
  }
  searchParamState.updates.clear()
  const search = searchParams.toString()
  const newUrl = `${window.location.pathname}${search.length > 0 ? `?${search}` : ""}${window.location.hash}`
  window.history.pushState({}, "", newUrl)
  searchParamState.updating = false
}
