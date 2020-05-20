import type {
  CApplicative,
  CApplicative1,
  CApplicative2,
  CApplicative2C,
  CApplicative3,
  CApplicative3C,
  CApplicative4,
  CApplicative4MA,
  CApplicative4MAP,
  CApplicative4MAC,
  CApplicative4MAPC
} from "../Applicative"
import type {
  CChain,
  CChain1,
  CChain2,
  CChain2C,
  CChain3,
  CChain3C,
  CChain4,
  CChain4MA,
  CChain4MAP,
  CChain4MAC,
  CChain4MAPC
} from "../Chain"
import type { URIS, URIS2, URIS3, URIS4, MaURIS } from "../HKT"

export interface CMonad<F> extends CApplicative<F>, CChain<F> {}
export interface CMonad1<F extends URIS> extends CApplicative1<F>, CChain1<F> {}
export interface CMonad2<M extends URIS2> extends CApplicative2<M>, CChain2<M> {}
export interface CMonad2C<M extends URIS2, L>
  extends CApplicative2C<M, L>,
    CChain2C<M, L> {}
export interface CMonad3<M extends URIS3> extends CApplicative3<M>, CChain3<M> {}
export interface CMonad3C<M extends URIS3, E>
  extends CApplicative3C<M, E>,
    CChain3C<M, E> {}
export interface CMonad4<M extends URIS4> extends CApplicative4<M>, CChain4<M> {}
export interface CMonad4MA<M extends MaURIS> extends CApplicative4MA<M>, CChain4MA<M> {}
export interface CMonad4MAC<M extends MaURIS, E>
  extends CApplicative4MAC<M, E>,
    CChain4MAC<M, E> {}
export interface CMonad4MAP<M extends MaURIS>
  extends CApplicative4MAP<M>,
    CChain4MAP<M> {}
export interface CMonad4MAPC<M extends MaURIS, E>
  extends CApplicative4MAPC<M, E>,
    CChain4MAPC<M, E> {}
