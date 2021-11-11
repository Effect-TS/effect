import * as T from "../../../Effect"
import * as E from "../../../Either"
import { pipe } from "../../../Function"
import * as S from "../_internal"

export interface BasePipe<UpperEnv = any, UpperErr = any, UpperElem = any> {
  readonly UpperEnv: UpperEnv
  readonly UpperErr: UpperErr
  readonly UpperElem: UpperElem

  readonly $R?: unknown
  readonly $E?: unknown
  readonly $A?: unknown

  readonly _R?: unknown
  readonly _E?: unknown
  readonly _A?: unknown
}

export type ElemOf<X extends BasePipe, R, E, A> = X extends { readonly _A: any }
  ? (X & {
      readonly $R: R
      readonly $E: E
      readonly $A: A
    })["_A"]
  : A

export type ErrOf<X extends BasePipe, R, E, A> = X extends { readonly _E: any }
  ? (X & {
      readonly $R: R
      readonly $E: E
      readonly $A: A
    })["_E"]
  : E

export type EnvOf<X extends BasePipe, R, E, A> = X extends { readonly _R: any }
  ? (X & {
      readonly $R: R
      readonly $E: E
      readonly $A: A
    })["_R"]
  : R

export interface Pipe<X extends BasePipe> {
  <R extends X["UpperEnv"], E extends X["UpperErr"], A extends X["UpperElem"]>(
    stream: S.Stream<R, E, A>
  ): S.Stream<EnvOf<X, R, E, A>, ErrOf<X, R, E, A>, ElemOf<X, R, E, A>>
}
export class Pipe<X extends BasePipe> extends Function {
  constructor(
    readonly pipeline: <
      R extends X["UpperEnv"],
      E extends X["UpperErr"],
      A extends X["UpperElem"]
    >(
      stream: S.Stream<R, E, A>
    ) => S.Stream<EnvOf<X, R, E, A>, ErrOf<X, R, E, A>, ElemOf<X, R, E, A>>
  ) {
    super()

    return new Proxy<Pipe<X>>(this, {
      apply(
        target: Pipe<X>,
        _thisArg: Pipe<X>,
        argumentsList: [S.Stream<any, any, any>]
      ) {
        return target.pipeline(argumentsList[0])
      }
    })
  }

  andThen<
    Right extends BasePipe<
      EnvOf<X, X["UpperEnv"], X["UpperErr"], X["UpperElem"]>,
      ErrOf<X, X["UpperEnv"], X["UpperErr"], X["UpperElem"]>,
      ElemOf<X, X["UpperEnv"], X["UpperErr"], X["UpperElem"]>
    >
  >(right: Pipe<Right>): Pipe<Compose<X, Right>> {
    return pipeline((s) => right(this(s)))
  }
}

export function pipeline<X extends BasePipe>(
  apply: <R extends X["UpperEnv"], E extends X["UpperErr"], A extends X["UpperElem"]>(
    stream: S.Stream<R, E, A>
  ) => S.Stream<EnvOf<X, R, E, A>, ErrOf<X, R, E, A>, ElemOf<X, R, E, A>>
): Pipe<X> {
  return new Pipe(apply)
}

export interface Compose<Left extends BasePipe, Right extends BasePipe>
  extends BasePipe {
  readonly UpperEnv: Left["UpperEnv"]
  readonly UpperErr: Left["UpperErr"]
  readonly UpperElem: Left["UpperElem"]

  readonly _R: EnvOf<
    Right,
    EnvOf<Left, this["$R"], this["$E"], this["$A"]>,
    ErrOf<Left, this["$R"], this["$E"], this["$A"]>,
    ElemOf<Left, this["$R"], this["$E"], this["$A"]>
  >

  readonly _E: ErrOf<
    Right,
    EnvOf<Left, this["$R"], this["$E"], this["$A"]>,
    ErrOf<Left, this["$R"], this["$E"], this["$A"]>,
    ElemOf<Left, this["$R"], this["$E"], this["$A"]>
  >

  readonly _A: ElemOf<
    Right,
    EnvOf<Left, this["$R"], this["$E"], this["$A"]>,
    ErrOf<Left, this["$R"], this["$E"], this["$A"]>,
    ElemOf<Left, this["$R"], this["$E"], this["$A"]>
  >
}

export interface MapEither<I, E, A> extends BasePipe {
  readonly UpperElem: I
  readonly _E: this["$E"] | E
  readonly _A: A
}

export const mapEither = <I, E, A>(f: (i: I) => E.Either<E, A>) =>
  pipeline<MapEither<I, E, A>>(S.chain((i) => E.fold_(f(i), S.fail, S.succeed)))

export interface MapOp<I, A> extends BasePipe {
  readonly UpperElem: I
  readonly _A: A
}

export const map = <I, A>(f: (i: I) => A) => pipeline<MapOp<I, A>>(S.map(f))

export interface MapEffect<I, R, E, A> extends BasePipe {
  readonly UpperElem: I
  readonly _R: this["$R"] & R
  readonly _E: this["$E"] | E
  readonly _A: A
}

export const mapEffect = <I, R, E, A>(f: (i: I) => T.Effect<R, E, A>) =>
  pipeline<MapEffect<I, R, E, A>>(S.mapEffect(f))

export interface OrDie extends BasePipe {
  readonly _E: never
}

export const orDie = pipeline<OrDie>(S.catchAll(S.die))

export interface Either extends BasePipe {
  readonly _A: E.Either<this["$E"], this["$A"]>
}

export const either = pipeline<Either>((_) =>
  pipe(
    _,
    S.map(E.right),
    S.catchAll((x) => S.succeed(E.left(x)))
  )
)

export interface UnEither extends BasePipe {
  readonly UpperElem: E.Either<any, any>

  readonly _E:
    | ([this["$A"]] extends [E.Either<infer E, infer A>] ? E : never)
    | this["$E"]

  readonly _A: [this["$A"]] extends [E.Either<infer E, infer A>] ? A : never
}

export const unEither = pipeline<UnEither>(
  S.chain((a) => (a._tag === "Left" ? S.fail(a.left) : S.succeed(a.right)))
)

//
// Usage
//

export const calcLength = map((s: string) => s.length)

export const printOut = mapEffect((n: number) =>
  T.succeedWith(() => {
    console.log(`got ${n}`)
  })
)

export const orFail = mapEither(
  E.fromPredicate(
    (n: number) => n > 0,
    (n) => new Error(`${n} is negative`)
  )
)

export const calcLengthAndPrint = calcLength
  .andThen(orFail)
  .andThen(printOut)
  .andThen(either)
  .andThen(unEither)

export const res = pipe(
  S.repeat("ok"),
  S.chain(() => S.fail("ok")),
  calcLengthAndPrint
)
