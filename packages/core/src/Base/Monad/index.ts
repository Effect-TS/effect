/* adapted from https://github.com/gcanti/fp-ts */

import type {
  CChain,
  CChain1,
  CChain2,
  CChain2C,
  CChain3,
  CChain3C,
  CChain4,
  CChain4C,
  CChain4MA,
  CChain4MAC
} from "../Chain"
import type { URIS, URIS2, URIS3, URIS4, MaURIS } from "../HKT"
import type { COf, COf1, COf2, COf2C, COf3, COf3C, COf4, COf4C } from "../Of"

export interface CMonad<F> extends COf<F>, CChain<F> {}
export interface CMonad1<F extends URIS> extends COf1<F>, CChain1<F> {}
export interface CMonad2<M extends URIS2> extends COf2<M>, CChain2<M> {}
export interface CMonad2C<M extends URIS2, L> extends COf2C<M, L>, CChain2C<M, L> {}
export interface CMonad3<M extends URIS3> extends COf3<M>, CChain3<M> {}
export interface CMonad3C<M extends URIS3, E> extends COf3C<M, E>, CChain3C<M, E> {}
export interface CMonad4<M extends URIS4> extends COf4<M>, CChain4<M> {}
export interface CMonad4C<M extends URIS4, E> extends COf4C<M, E>, CChain4C<M, E> {}
export interface CMonad4MA<M extends MaURIS> extends COf4<M>, CChain4MA<M> {}
export interface CMonad4MAC<M extends MaURIS, E>
  extends COf4C<M, E>,
    CChain4MAC<M, E> {}
