import type * as S from "@effect-ts/core/Classic/Show"

import type { InterfaceA, IntersectionA, TaggedUnionA } from "../../Internal/Config"
import type { ShowURI } from "../hkt"

declare module "../../Algebra/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [ShowURI]: {
      shows: IntersectionA<A, ShowURI>
    }
  }
}

declare module "../../Algebra/newtype" {
  interface IsoConfig<L, A, N> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/object" {
  interface InterfaceConfig<Props> {
    [ShowURI]: {
      show: InterfaceA<Props, ShowURI>
    }
  }
  interface PartialConfig<Props> {
    [ShowURI]: {
      show: InterfaceA<Props, ShowURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [ShowURI]: {
      show: InterfaceA<Props & PropsPartial, ShowURI>
      showPartial: InterfaceA<PropsPartial, ShowURI>
    }
  }
}

declare module "../../Algebra/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface ArrayConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface NullableConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface MutableConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface OptionalConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [ShowURI]: {
      left: S.Show<EA>
      right: S.Show<AA>
    }
  }
  interface OptionConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/refined" {
  interface RefinedConfig<E, A, B> {
    [ShowURI]: {
      show: S.Show<A>
      showRefined: S.Show<B>
    }
  }
  interface PredicateConfig<E, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [ShowURI]: {
      show: S.Show<A>
    }
  }
}

declare module "../../Algebra/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [ShowURI]: {
      shows: TaggedUnionA<Types, ShowURI>
    }
  }
}
