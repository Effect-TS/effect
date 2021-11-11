import { pipe } from "../../../Function"
import * as S from "../_internal"

export type OutOf<X, R, E, A> = X extends { readonly _A: any }
  ? (X & { readonly $R: R; readonly $E: E; readonly $A: A })["_A"]
  : A

export type ErrOf<X, R, E, A> = X extends { readonly _E: any }
  ? (X & { readonly $R: R; readonly $E: E; readonly $A: A })["_E"]
  : E

export type EnvOf<X, R, E, A> = X extends { readonly _R: any }
  ? (X & { readonly $R: R; readonly $E: E; readonly $A: A })["_R"]
  : R

export interface Pipe<UpperEnv, LowerEnv, UpperErr, LowerErr, UpperElem, LowerElem, X> {
  <R extends UpperEnv, E extends UpperErr, A extends UpperElem>(
    stream: S.Stream<R | LowerEnv, E | LowerErr, A | LowerElem>
  ): S.Stream<
    EnvOf<X, R | LowerEnv, E | LowerErr, A | LowerElem>,
    ErrOf<X, R | LowerEnv, E | LowerErr, A | LowerElem>,
    OutOf<X, R | LowerEnv, E | LowerErr, A | LowerElem>
  >
}

export interface BasePipe {
  readonly $R: unknown
  readonly $E: unknown
  readonly $A: unknown

  readonly _R?: unknown
  readonly _E?: unknown
  readonly _A?: unknown
}

interface Length extends BasePipe {
  readonly _A: number
}

export const length: Pipe<unknown, never, unknown, never, string, never, Length> =
  S.map((_) => _.length)

interface HandleError extends BasePipe {
  readonly _E: Exclude<this["$E"], Error>
}

export const handleError: Pipe<
  unknown,
  never,
  unknown,
  never,
  unknown,
  never,
  HandleError
> = S.catchAll((_) =>
  _ instanceof Error ? S.die("") : S.fail(_ as Exclude<typeof _, Error>)
)

interface Compose<SelfX, ThatX> extends BasePipe {
  readonly _R: EnvOf<
    ThatX,
    EnvOf<SelfX, this["$R"], this["$E"], this["$A"]>,
    ErrOf<SelfX, this["$R"], this["$E"], this["$A"]>,
    OutOf<SelfX, this["$R"], this["$E"], this["$A"]>
  >
  readonly _E: ErrOf<
    ThatX,
    EnvOf<SelfX, this["$R"], this["$E"], this["$A"]>,
    ErrOf<SelfX, this["$R"], this["$E"], this["$A"]>,
    OutOf<SelfX, this["$R"], this["$E"], this["$A"]>
  >
  readonly _A: OutOf<
    ThatX,
    EnvOf<SelfX, this["$R"], this["$E"], this["$A"]>,
    ErrOf<SelfX, this["$R"], this["$E"], this["$A"]>,
    OutOf<SelfX, this["$R"], this["$E"], this["$A"]>
  >
}

export declare function compose<
  UpperEnv1,
  LowerEnv1,
  UpperErr1,
  LowerErr1,
  UpperElem1,
  LowerElem1,
  X1
>(
  that: Pipe<UpperEnv1, LowerEnv1, UpperErr1, LowerErr1, UpperElem1, LowerElem1, X1>
): <UpperEnv, LowerEnv, UpperErr, LowerErr, UpperElem, LowerElem, X>(
  self: Pipe<UpperEnv, LowerEnv, UpperErr, LowerErr, UpperElem, LowerElem, X>
) => Pipe<
  UpperEnv1 & UpperEnv,
  LowerEnv1 | LowerEnv,
  UpperErr1 & UpperErr,
  LowerErr1 | LowerErr,
  UpperElem1 & UpperElem,
  LowerElem1 | LowerElem1,
  Compose<X, X1>
>

const out = pipe(
  S.repeat("ok"),
  length,
  S.chain((n) => (n > 10 ? S.fail(new Error("bla")) : S.succeed(n))),
  handleError
)

const computeLengthAndHandleError = pipe(length, compose(handleError))

const z = pipe(
  S.repeat("ok"),
  S.chain((n) => (n !== "ok" ? S.fail(new Error("bla")) : S.succeed(n))),
  computeLengthAndHandleError
)
