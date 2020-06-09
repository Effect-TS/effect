import type { IntersectionA, InterfaceA, TaggedUnionA } from "../../config"
import type { GuardURI, Guard } from "../hkt"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [GuardURI]: {
      guards: IntersectionA<A, GuardURI>
    }
  }
}

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [GuardURI]: {
      guard: InterfaceA<Props, GuardURI>
    }
  }
  interface PartialConfig<Props> {
    [GuardURI]: {
      guard: InterfaceA<Props, GuardURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [GuardURI]: {
      guard: InterfaceA<Props, GuardURI>
      guardPartial: InterfaceA<PropsPartial, GuardURI>
    }
  }
}

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface ArrayConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface NullableConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface MutableConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface OptionalConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [GuardURI]: {
      left: Guard<EA>
      right: Guard<AA>
    }
  }
  interface OptionConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
  interface PredicateConfig<E, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "@matechs/morphic-alg/set" {
  interface SetConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "@matechs/morphic-alg/str-map" {
  interface StrMapConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "@matechs/morphic-alg/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [GuardURI]: {
      guards: TaggedUnionA<Types, GuardURI>
    }
  }
}
