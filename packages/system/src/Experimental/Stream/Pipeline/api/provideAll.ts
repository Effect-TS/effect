// ets_tracing: off

import * as ProvideAll from "../../_internal/api/provideAll"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that provides the specified environment.
 */
export function provideAll<Env>(
  env: Env
): C.Pipeline<unknown, Env, C.$E, C.$E, C.$A, C.$A> {
  return C.make((stream: S.Stream<Env, C.$E, C.$A>) =>
    ProvideAll.provideAll_(stream, env)
  )
}
