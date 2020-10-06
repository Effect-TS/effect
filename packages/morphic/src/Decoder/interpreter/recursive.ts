import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive1, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"

export const decoderRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive1<DecoderURI, Env> => ({
    _F: DecoderURI,
    recursive: <A>(
      a: (x: (env: Env) => DecoderType<A>) => (env: Env) => DecoderType<A>,
      config?: {
        name?: string
        config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
      }
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new DecoderType(
          pipe(
            () => get()(env).decoder,
            (getDecoder) =>
              decoderApplyConfig(config?.config)(
                {
                  decode: (u) => getDecoder().decode(u)
                },
                env,
                {}
              )
          )
        )
      return res
    }
  })
)
