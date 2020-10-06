import type { InterfaceA, IntersectionA, TaggedUnionA } from "../../Internal/Config"
import type { Guard, GuardURI } from "../hkt"

declare module "../../Algebra/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [GuardURI]: {
      guards: IntersectionA<A, GuardURI>
    }
  }
}

declare module "../../Algebra/newtype" {
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

declare module "../../Algebra/object" {
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

declare module "../../Algebra/primitives" {
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

declare module "../../Algebra/refined" {
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

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "../../Algebra/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [GuardURI]: {
      guards: TaggedUnionA<Types, GuardURI>
    }
  }
}
