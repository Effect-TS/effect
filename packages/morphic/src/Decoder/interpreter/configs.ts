import type { InterfaceA, IntersectionA, TaggedUnionA } from "../../Internal/Config"
import type { Validate } from "../common"
import type { DecoderURI } from "../hkt"

declare module "../../Algebra/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [DecoderURI]: {
      decoders: IntersectionA<A, DecoderURI>
    }
  }
}

declare module "../../Algebra/newtype" {
  interface NewtypeConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/object" {
  interface InterfaceConfig<Props> {
    [DecoderURI]: {
      decoder: InterfaceA<Props, DecoderURI>
    }
  }
  interface PartialConfig<Props> {
    [DecoderURI]: {
      decoder: InterfaceA<Props, DecoderURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [DecoderURI]: {
      decoder: InterfaceA<Props, DecoderURI>
      decoderPartial: InterfaceA<PropsPartial, DecoderURI>
    }
  }
}

declare module "../../Algebra/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface ArrayConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface NullableConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface MutableConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface OptionalConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [DecoderURI]: {
      left: Validate<EA>
      right: Validate<AA>
    }
  }
  interface OptionConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/refined" {
  interface RefinedConfig<E, A, B> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
  interface PredicateConfig<E, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [DecoderURI]: {
      decoder: Validate<A>
    }
  }
}

declare module "../../Algebra/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [DecoderURI]: {
      decoders: TaggedUnionA<Types, DecoderURI>
    }
  }
}
