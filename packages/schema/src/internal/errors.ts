import * as util_ from "./util.js"

/** @internal */
export const getDuplicatePropertySignatureErrorMessage = (name: PropertyKey): string =>
  `Duplicate property signature ${util_.formatUnknown(name)}`

/** @internal */
export const getDuplicateIndexSignatureErrorMessage = (name: "string" | "symbol"): string =>
  `Duplicate index signature for type \`${name}\``

/** @internal */
export const getIndexSignatureParameterErrorMessage =
  "An index signature parameter type must be `string`, `symbol`, a template literal type or a refinement of the previous types"

/** @internal */
export const getRequiredElementFollowinAnOptionalElementErrorMessage =
  "A required element cannot follow an optional element. ts(1257)"

/** @internal */
export const getDuplicatePropertySignatureTransformationErrorMessage = (name: PropertyKey): string =>
  `Duplicate property signature transformation ${util_.formatUnknown(name)}`

/** @internal */
export const getArbitraryErrorMessage = (message: string) => `cannot build an Arbitrary for ${message}`

/** @internal */
export const getPrettyErrorMessage = (message: string) => `cannot build a Pretty for ${message}`

/** @internal */
export const getEquivalenceErrorMessage = (message: string) => `cannot build an Equivalence for ${message}`

/** @internal */
export const getAPIErrorMessage = (api: string, message: string) => `${api}: ${message}`
