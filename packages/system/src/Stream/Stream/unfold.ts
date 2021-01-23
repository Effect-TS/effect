import type * as O from "../../Option"
import * as T from "../_internal/effect"
import { unfoldM } from "./unfoldM"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`
 */
export function unfold<S>(s: S) {
  return <A>(f: (s: S) => O.Option<readonly [A, S]>) =>
    unfoldM(s)((s) => T.succeed(f(s)))
}
