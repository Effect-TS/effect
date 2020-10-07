import type { InterfaceA, IntersectionA, TaggedUnionA } from "../../Internal/Config"
import type { Strict, StrictURI } from "../hkt"

declare module "../../Algebra/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [StrictURI]: {
      stricts: IntersectionA<A, StrictURI>
    }
  }
}

declare module "../../Algebra/newtype" {
  interface NewtypeConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/object" {
  interface InterfaceConfig<Props> {
    [StrictURI]: {
      strict: InterfaceA<Props, StrictURI>
    }
  }
  interface PartialConfig<Props> {
    [StrictURI]: {
      strict: InterfaceA<Props, StrictURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [StrictURI]: {
      strict: InterfaceA<Props, StrictURI>
      strictPartial: InterfaceA<PropsPartial, StrictURI>
    }
  }
}

declare module "../../Algebra/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface ArrayConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface NullableConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface MutableConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface OptionalConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [StrictURI]: {
      left: Strict<EA>
      right: Strict<AA>
    }
  }
  interface OptionConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/refined" {
  interface RefinedConfig<E, A, B> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
  interface PredicateConfig<E, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [StrictURI]: {
      strict: Strict<A>
    }
  }
}

declare module "../../Algebra/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [StrictURI]: {
      stricts: TaggedUnionA<Types, StrictURI>
    }
  }
}
