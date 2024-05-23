import * as util_ from "./util.js"

/** @internal */
export const getDuplicatePropertySignatureErrorMessage = (name: PropertyKey): string =>
  `Duplicate property signature ${util_.formatUnknown(name)}`

/** @internal */
export const getErrorMessage = (api: string, message: string) => `${api}: ${message}`

/** @internal */
export const getErrorMessageWithPath = (message: string, path: ReadonlyArray<PropertyKey>) => {
  let out = message
  if (path.length > 0) {
    out += ` (path [${path.map(util_.formatPropertyKey).join(", ")}])`
  }
  return out
}
