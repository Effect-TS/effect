import type { GetAlgebra } from "@morphic-ts/algebras/lib/core"

import type { InferredAlgebra, InferredProgram } from "../usage/program-infer"
import type { AnyConfigEnv } from "../usage/summoner"

import type { IntersectionURI } from "@matechs/morphic-alg/intersection"
import type { NewtypeURI } from "@matechs/morphic-alg/newtype"
import type { ObjectURI } from "@matechs/morphic-alg/object"
import type { PrimitiveURI } from "@matechs/morphic-alg/primitives"
import type { RecursiveURI } from "@matechs/morphic-alg/recursive"
import type { RefinedURI } from "@matechs/morphic-alg/refined"
import type { SetURI } from "@matechs/morphic-alg/set"
import type { StrMapURI } from "@matechs/morphic-alg/str-map"
import type { TaggedUnionsURI } from "@matechs/morphic-alg/tagged-union"
import type { UnknownURI } from "@matechs/morphic-alg/unknown"

export const ProgramURI = "@matechs/morphic/ProgramURI" as const

export type ProgramURI = typeof ProgramURI

export interface AlgebraNoUnion<F, Env> extends InferredAlgebra<F, ProgramURI, Env> {}

export interface P<R extends AnyConfigEnv, E, A>
  extends InferredProgram<R, E, A, ProgramURI> {}

declare module "../usage/program-type" {
  interface ProgramAlgebraURI {
    [ProgramURI]: GetAlgebra<
      | PrimitiveURI
      | IntersectionURI
      | ObjectURI
      | RecursiveURI
      | SetURI
      | StrMapURI
      | TaggedUnionsURI
      | UnknownURI
      | NewtypeURI
      | RefinedURI
    >
  }

  interface ProgramAlgebra<F, Env> {
    [ProgramURI]: AlgebraNoUnion<F, Env>
  }

  interface ProgramType<R extends AnyConfigEnv, E, A> {
    [ProgramURI]: P<R, E, A>
  }
}
