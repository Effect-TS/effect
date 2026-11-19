/**
 * @since 4.1.5
 */
import { createContext } from "solid-js"

/**
 * Solid 2 contexts are their own provider component, while Solid 1 contexts
 * expose `Provider`. Probing a context keeps this module free of named imports
 * that only exist in one major version.
 *
 * @internal
 */
export const isSolid2: boolean = !("Provider" in createContext<unknown>(null))
