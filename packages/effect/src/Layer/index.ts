import * as A from "../Array"
import { UnionToIntersection } from "../Base/Apply"
import * as T from "../Effect"
import { pipe } from "../Function"
import * as M from "../Managed"
import { NonEmptyArray } from "../NonEmptyArray"

type LayerPayload<S, R, E, A> = M.Managed<S, R, E, A>

type SL<Layers extends readonly { payload: LayerPayload<any, any, any, any> }[]> = {
  [k in keyof Layers & number]: Layers[k]["payload"]["_S"] extends () => infer X
    ? X
    : never
}[number]

type RL<
  Layers extends readonly { payload: LayerPayload<any, any, any, any> }[]
> = UnionToIntersection<
  {
    [k in keyof Layers & number]: Layers[k]["payload"]["_R"] extends (
      _R: infer X
    ) => void
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

type EL<Layers extends readonly { payload: LayerPayload<any, any, any, any> }[]> = {
  [k in keyof Layers & number]: Layers[k]["payload"]["_E"] extends () => infer X
    ? X
    : never
}[number]

type AL<
  Layers extends readonly { payload: LayerPayload<any, any, any, any> }[]
> = UnionToIntersection<
  {
    [k in keyof Layers & number]: Layers[k]["payload"]["_A"] extends () => infer X
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export class Layer<S, R, E, A> {
  constructor(readonly payload: LayerPayload<S, R, E, A>) {}

  /**
   * Merge vertically with the current layer, _ will provide environment to current
   * @param _ layer
   */
  with<S2, R2, E2, A2>(
    _: Layer<S2, R2, E2, A2>
  ): Layer<S | S2, T.Erase<R, A2> & R2, E | E2, A2 & A> {
    return new Layer(
      M.chain_(_.payload, (a2) =>
        M.chain_(M.useProvider_(this.payload as any, T.provide(a2)), (a: any) =>
          M.pure({
            ...a2,
            ...a
          })
        )
      )
    )
  }

  /**
   * Merge the current layer with a non empty array of layers,
   * the layers are merged horizontally between each other and vertically with the current layer
   * @param layers layers
   */
  withMany<Layers extends NonEmptyArray<Layer<any, any, any, any>>>(
    ...layers: Layers & { 0: Layer<any, any, any, any> }
  ): Layer<
    SL<Layers> | S,
    RL<Layers> & T.Erase<R, AL<Layers>>,
    EL<Layers> | E,
    AL<Layers> & A
  > {
    return this.with(
      new Layer(
        M.map_(
          M.sequenceArray(layers.map((_) => _.payload)),
          A.reduce({} as any, (b, a) => ({ ...b, ...a }))
        )
      )
    )
  }

  /**
   * Merge the current layer with a non empty array of layers, all the layers are merged horizontally
   * @param layers layers
   */
  combine<Layers extends NonEmptyArray<Layer<any, any, any, any>>>(
    ...layers: Layers & { 0: Layer<any, any, any, any> }
  ): Layer<SL<Layers> | S, R & RL<Layers>, EL<Layers> | E, AL<Layers> & A> {
    return new Layer(
      M.map_(
        M.sequenceArray([this, ...layers].map((_) => _.payload)),
        A.reduce({} as any, (b, a) => ({ ...b, ...a }))
      )
    )
  }

  /**
   * Use the current layer to provide environment to an effect
   * @param op effect
   */
  use: T.Provider<R, A, E, S> = (op) => M.use(this.payload, (a) => T.provide(a)(op))

  /**
   * Sometimes TypeScript will infer R = never when using "use" in conditions where R = R2 and "use" appears in a right-side,
   * i.e. in Do like .doL(() => Layer.use(program)) in those scenarios "erase" can be used in place of "use" to fix the inference
   * @param _ effect
   */
  erase = <S2, R2, E2, A2>(
    _: T.Effect<S2, R2, E2, A2>
  ): T.Effect<S | S2, R & T.Erase<R2, A>, E | E2, A2> =>
    M.use(this.payload, (a) => T.provide(a)(_))

  /**
   * Use a layer as a default provider that can be overwritten by subsequent ones
   */
  default() {
    return fromProvider<S, R, E, A>((op) =>
      M.use(this.payload, (a) => T.provide(a, "inverted")(op))
    )
  }
}

/**
 * Construct a layer by using a value
 */
export function fromValue<A>(_: A): Layer<never, unknown, never, A> {
  return new Layer(M.pure(_))
}

/**
 * Construct a layer by using a value constructed by requiring an environment R2
 */
export function fromValueWith<R2>(): <A>(
  _: (_: R2) => A
) => Layer<never, R2, never, A> {
  return (_) =>
    new Layer(M.encaseEffect(T.chain_(T.accessEnvironment<R2>(), (r) => T.pure(_(r)))))
}

/**
 * Construct a layer by using an effect
 */
export function fromEffect<S, R, E, A>(_: T.Effect<S, R, E, A>): Layer<S, R, E, A> {
  return new Layer(M.encaseEffect(_))
}

/**
 * Construct a layer by using an effect constructed by requiring an environment R2
 */
export function fromEffectWith<R2>(): <S, R, E, A>(
  _: (_: R2) => T.Effect<S, R, E, A>
) => Layer<S, R & R2, E, A> {
  return (_) => new Layer(M.encaseEffect(T.chain_(T.accessEnvironment<R2>(), _)))
}

/**
 * Construct a layer by using a managed
 */
export function fromManaged<S, R, E, A>(_: M.Managed<S, R, E, A>): Layer<S, R, E, A> {
  return new Layer(_)
}

/**
 * Construct a layer by using a managed constructed by requiring an environment R2
 */
export function fromManagedWith<R2>(): <S, R, E, A>(
  _: (_: R2) => M.Managed<S, R, E, A>
) => Layer<S, R & R2, E, A> {
  return (_) => new Layer(M.chain_(M.encaseEffect(T.accessEnvironment<R2>()), _))
}

/**
 * Construct a layer by using a provider
 */
export function fromProvider<S = never, R = unknown, E = never, A = unknown>(
  provider: T.Provider<R, A, E, S>
): Layer<S, R, E, A> {
  return new Layer(M.useProvider_(M.encaseEffect(T.accessEnvironment<A>()), provider))
}

/**
 * Construct a layer by using a provider constructed by requiring an environment R2
 */
export function fromProviderWith<R2>(): <
  SK = never,
  RK = unknown,
  EK = never,
  AK = unknown
>(
  provider: (_: R2) => T.Provider<RK, AK, EK, SK>
) => Layer<SK, RK & R2, EK, AK> {
  return <SK, RK, EK, AK>(provider: (_: R2) => T.Provider<RK, AK, EK, SK>) =>
    pipe(
      T.accessEnvironment<R2>(),
      useEffect((r) => fromProvider(provider(r)))
    )
}

/**
 * To be used like "class MyService implements Implementation<ServiceSpec>"
 * where ServiceSpec is a URI -> ServiceDefinition interface
 */
export type Implementation<C> = C[keyof C]

/**
 * Construct a layer by using a class based constructor
 * requiring additional environment if specified as first parameter in the constructor
 */
export function fromConstructor<C>(uri: keyof C) {
  return <
    K extends Implementation<C>,
    X extends { new (): K } | { new (deps: any): K }
  >(
    X: X
  ): Layer<
    never,
    UnionToIntersection<
      X extends { new (...args: infer args): K } ? args[number] : never
    >,
    never,
    C
  > =>
    fromEffect(
      T.map_(
        T.accessEnvironment<
          UnionToIntersection<
            X extends { new (...args: infer args): K } ? args[number] : never
          >
        >(),
        (env): C =>
          ({
            [uri]: new X(env)
          } as any)
      )
    )
}

/**
 * To be used like "class MyService implements ManagedImplementation<ServiceSpec>"
 * where ServiceSpec is a URI -> ServiceDefinition interface
 *
 * Additionally defines a destroy mathod called on release
 */
export type ManagedImplementation<C> = C[keyof C] & {
  destroy(): T.Effect<any, any, any, any>
}

/**
 * Construct a layer by using a class based constructor
 * requiring additional environment if specified as first parameter in the constructor
 *
 * uses a managed internally that upon release will call the destroy method provided
 */
export function fromManagedConstructor<C>(uri: keyof C) {
  return <
    X extends
      | { new (): ManagedImplementation<C> }
      | { new (deps: any): ManagedImplementation<C> }
  >(
    X: X
  ): Layer<
    X extends {
      new (...args: any[]): {
        destroy(): T.Effect<infer _S, infer _R, infer _E, infer _A>
      }
    }
      ? _S
      : never,
    UnionToIntersection<
      X extends {
        new (...args: infer args): {
          destroy(): T.Effect<infer _S, infer _R, infer _E, infer _A>
        }
      }
        ? (unknown extends _R ? never : _R) | args[number]
        : never
    >,
    X extends {
      new (...args: any[]): {
        destroy(): T.Effect<infer _S, infer _R, infer _E, infer _A>
      }
    }
      ? _E
      : never,
    C
  > =>
    fromManaged(
      M.chain_(M.encaseEffect(T.accessEnvironment<any>()), (env) =>
        M.bracket(
          T.pure<C>({
            [uri]: new X(env)
          } as any),
          (x) => (x[uri] as ManagedImplementation<C>).destroy()
        )
      )
    )
}

/**
 * Construct a layer dependent on a provided effect
 * @param layer fn
 */
export function useEffect<A, S2, R2, E2, A2>(layer: (_: A) => Layer<S2, R2, E2, A2>) {
  return <S, R, E>(effect: T.Effect<S, R, E, A>): Layer<S | S2, R & R2, E | E2, A2> =>
    new Layer(M.chain_(M.encaseEffect(effect), (a) => layer(a).payload))
}

/**
 * Construct a layer dependent on a provided managed
 * @param layer fn
 */
export function useManaged<A, S2, R2, E2, A2>(layer: (_: A) => Layer<S2, R2, E2, A2>) {
  return <S, R, E>(managed: M.Managed<S, R, E, A>): Layer<S | S2, R & R2, E | E2, A2> =>
    new Layer(M.chain_(managed, (a) => layer(a).payload))
}

/**
 * Empty Layer, can be used as the root for composition
 */
export const Empty =
  /*#__PURE__*/
  (() => fromValue({}))()
