import type { IntersectionLA, InterfaceLA, TaggedUnionLA } from "../../config"
import type * as M from "../codec"
import type { ModelURI } from "../hkt"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [ModelURI]: {
      models: IntersectionLA<L, A, ModelURI>
    }
  }
}

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface CoerceConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface IsoConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface PrismConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [ModelURI]: {
      model: InterfaceLA<Props, ModelURI>
    }
  }
  interface PartialConfig<Props> {
    [ModelURI]: {
      model: InterfaceLA<Props, ModelURI>
    }
  }
  interface BothConfig<Props, PropsPartial> {
    [ModelURI]: {
      model: InterfaceLA<Props, ModelURI>
      modelPartial: InterfaceLA<PropsPartial, ModelURI>
    }
  }
}

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface ArrayConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface NullableConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface MutableConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface OptionalConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [ModelURI]: {
      left: M.Codec<EA, EE>
      right: M.Codec<AA, AE>
    }
  }
  interface OptionConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [ModelURI]: {
      model: M.Codec<A, E>
    }
  }
}

declare module "@matechs/morphic-alg/set" {
  interface SetConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

declare module "@matechs/morphic-alg/str-map" {
  interface StrMapConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

declare module "@matechs/morphic-alg/tagged-union" {
  interface TaggedUnionConfig<Types> {
    [ModelURI]: {
      models: TaggedUnionLA<Types, ModelURI>
    }
  }
}
