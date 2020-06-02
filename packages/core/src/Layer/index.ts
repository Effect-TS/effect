import * as A from "../Array"
import { UnionToIntersection } from "../Base/Apply"
import * as T from "../Effect"
import * as M from "../Managed"
import { NonEmptyArray } from "../NonEmptyArray"
import { pipe } from "../Pipe"

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

  merge<Layers extends NonEmptyArray<Layer<any, any, any, any>>>(
    ...layers: Layers & { 0: Layer<any, any, any, any> }
  ): Layer<
    SL<Layers> | S,
    T.Erase<R, RL<Layers>> & RL<Layers>,
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

  use: T.Provider<R, A, E, S> = (op) => M.use(this.payload, (a) => T.provide(a)(op))

  /**
   * Use a layer as a default provider that can be overwritten by subsequent ones
   */
  inverted() {
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

export function useEffect<A, S2, R2, E2, A2>(layer: (_: A) => Layer<S2, R2, E2, A2>) {
  return <S, R, E>(effect: T.Effect<S, R, E, A>): Layer<S | S2, R & R2, E | E2, A2> =>
    new Layer(M.chain_(M.encaseEffect(effect), (a) => layer(a).payload))
}

export function useManaged<A, S2, R2, E2, A2>(layer: (_: A) => Layer<S2, R2, E2, A2>) {
  return <S, R, E>(managed: M.Managed<S, R, E, A>): Layer<S | S2, R & R2, E | E2, A2> =>
    new Layer(M.chain_(managed, (a) => layer(a).payload))
}

export const Empty =
  /*#__PURE__*/
  (() => fromValue({}))()
