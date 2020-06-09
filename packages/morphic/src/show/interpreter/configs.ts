import type { IntersectionA, InterfaceA, TaggedUnionA } from "../../config"
import type { ShowURI } from "../hkt"

import type * as S from "@matechs/core/Show"
import type { Show } from "@matechs/core/Show"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [ShowURI]: {
      shows: IntersectionA<A, S.URI>
    }
  }
}

declare module "@matechs/morphic-alg/newtype" {
  interface IsoConfig<L, A, N> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [ShowURI]: {
      show: InterfaceA<Props, S.URI>
    }
  }
  interface PartialConfig<Props> {
    [ShowURI]: {
      show: InterfaceA<Props, S.URI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [ShowURI]: {
      show: InterfaceA<Props & PropsPartial, S.URI>
      showPartial: InterfaceA<PropsPartial, S.URI>
    }
  }
}

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface ArrayConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface NullableConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface MutableConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface OptionalConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [ShowURI]: {
      left: Show<EA>
      right: Show<AA>
    }
  }
  interface OptionConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [ShowURI]: {
      show: Show<A>
      showRefined: Show<B>
    }
  }
  interface PredicateConfig<E, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

declare module "@matechs/morphic-alg/set" {
  interface SetConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

declare module "@matechs/morphic-alg/str-map" {
  interface StrMapConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

declare module "@matechs/morphic-alg/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [ShowURI]: {
      shows: TaggedUnionA<Types, S.URI>
    }
  }
}
