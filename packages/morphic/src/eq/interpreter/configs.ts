import type { IntersectionA, InterfaceA, TaggedUnionA } from "../../config"
import type { EqURI } from "../hkt"

import type * as E from "@matechs/core/Eq"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [EqURI]: {
      equals: IntersectionA<A, E.URI>
    }
  }
}

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
}

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [EqURI]: {
      eq: InterfaceA<Props, E.URI>
    }
  }
  interface PartialConfig<Props> {
    [EqURI]: {
      eq: InterfaceA<Props, E.URI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [EqURI]: {
      eq: InterfaceA<Props, E.URI>
      eqPartial: InterfaceA<PropsPartial, E.URI>
    }
  }
}

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface ArrayConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface NullableConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface OptionalConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [EqURI]: {
      left: E.Eq<EA>
      right: E.Eq<AA>
    }
  }
  interface OptionConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
}

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [EqURI]: {
      eq: E.Eq<A>
      eqRefined: E.Eq<A>
    }
  }
}

declare module "@matechs/morphic-alg/set" {
  interface SetConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
}

declare module "@matechs/morphic-alg/str-map" {
  interface StrMapConfig<L, A> {
    [EqURI]: {
      eq: E.Eq<A>
    }
  }
}

declare module "@matechs/morphic-alg/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [EqURI]: {
      equals: TaggedUnionA<Types, E.URI>
    }
  }
}
