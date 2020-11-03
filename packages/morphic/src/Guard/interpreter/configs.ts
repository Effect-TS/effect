import type { InterfaceLA, IntersectionLA, TaggedUnionLA } from "../../Algebra/Config"
import type { Guard, GuardURI } from "../base"

declare module "../../Algebra/Intersection" {
  interface IntersectionConfig<
    L extends readonly unknown[],
    A extends readonly unknown[]
  > {
    [GuardURI]: {
      guards: IntersectionLA<L, A, GuardURI>
    }
  }
}

declare module "../../Algebra/Newtype" {
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

declare module "../../Algebra/Object" {
  interface InterfaceConfig<Props> {
    [GuardURI]: {
      guard: InterfaceLA<Props, GuardURI>
    }
  }
  interface PartialConfig<Props> {
    [GuardURI]: {
      guard: InterfaceLA<Props, GuardURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [GuardURI]: {
      guard: InterfaceLA<Props, GuardURI>
      guardPartial: InterfaceLA<PropsPartial, GuardURI>
    }
  }
}

declare module "../../Algebra/Primitives" {
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

declare module "../../Algebra/Refined" {
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

declare module "../../Algebra/Set" {
  interface SetConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "../../Algebra/Record" {
  interface RecordConfig<L, A> {
    [GuardURI]: {
      guard: Guard<A>
    }
  }
}

declare module "../../Algebra/TaggedUnion" {
  interface TaggedUnionConfig<Types> {
    [GuardURI]: {
      guards: TaggedUnionLA<Types, GuardURI>
    }
  }
}
