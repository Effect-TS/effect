/**
 * @since 0.2.0
 */
export interface Newtype<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

/**
 * @since 0.2.0
 */
export type AnyNewtype = Newtype<any, any>

/**
 * @since 0.2.0
 */
export type URIOf<N extends AnyNewtype> = N["_URI"]

/**
 * @since 0.2.0
 */
export type CarrierOf<N extends AnyNewtype> = N["_A"]

/**
 * @since 0.2.0
 */
export interface Concat<
  N1 extends Newtype<object, any>,
  N2 extends Newtype<object, CarrierOf<N1>>
> extends Newtype<URIOf<N1> & URIOf<N2>, CarrierOf<N1>> {}

/**
 * @since 0.2.0
 */
export interface Extends<N extends AnyNewtype, Tags extends object>
  extends Newtype<Tags & URIOf<N>, CarrierOf<N>> {}
