import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive2, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive2<EncoderURI, Env> => ({
    _F: EncoderURI,
    recursive: <L, A>(
      a: (x: (env: Env) => EncoderType<A, L>) => (env: Env) => EncoderType<A, L>,
      config?: {
        name?: string
        config?: ConfigsForType<Env, L, A, RecursiveConfig<L, A>>
      }
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new EncoderType(
          pipe(
            () => get()(env).encoder,
            (getEncoder) =>
              encoderApplyConfig(config?.config)(
                {
                  encode: (u) => getEncoder().encode(u)
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
