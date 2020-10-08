import type { InterfaceA, IntersectionA, TaggedUnionA } from "../../Internal/Config"
import type { Decoder } from "../common"
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
      decoder: Decoder<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [DecoderURI]: {
      decoder: Decoder<A>
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
      decoder: Decoder<A>
    }
  }
  interface ArrayConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface NullableConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface MutableConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface OptionalConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [DecoderURI]: {
      left: Decoder<EA>
      right: Decoder<AA>
    }
  }
  interface OptionConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
}

declare module "../../Algebra/refined" {
  interface RefinedConfig<E, A, B> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
  interface PredicateConfig<E, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
}

declare module "../../Algebra/set" {
  interface SetConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
    }
  }
}

declare module "../../Algebra/record" {
  interface RecordConfig<L, A> {
    [DecoderURI]: {
      decoder: Decoder<A>
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
