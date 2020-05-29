import * as A from "../Array"
import { UnionToIntersection } from "../Base/Apply"
import * as T from "../Effect"
import * as M from "../Managed"

export type Pure<A> = {
  _tag: "Pure"
  value: A
  inverted?: "regular" | "inverted"
}

export type EncaseEffect<S, R, E, A> = {
  _tag: "EncaseEffect"
  effect: T.Effect<S, R, E, A>
  inverted?: "regular" | "inverted"
}

export type ChainEffect<S, R, E, A> = {
  _tag: "ChainEffect"
  effect: T.Effect<S, R, E, unknown>
  layer: (_: unknown) => Layer<S, R, E, A>
}

export type ChainManaged<S, R, E, A> = {
  _tag: "ChainManaged"
  managed: M.Managed<S, R, E, unknown>
  layer: (_: unknown) => Layer<S, R, E, A>
}

export type EncaseManaged<S, R, E, A> = {
  _tag: "EncaseManaged"
  managed: M.Managed<S, R, E, A>
  inverted?: "regular" | "inverted"
}

export type EncaseProvider<S, R, E, A> = {
  _tag: "EncaseProvider"
  provider: T.Provider<any, any, any, any>
  _S: () => S
  _R: (_: R) => void
  _E: () => E
  _A: () => A
}

export type Merge<S, R, E, A> = {
  _tag: "Merge"
  layers: Layer<S, R, E, A>[]
}

export type Layer<S, R, E, A> =
  | Pure<A>
  | EncaseEffect<S, R, E, A>
  | ChainEffect<S, R, E, A>
  | EncaseManaged<S, R, E, A>
  | ChainManaged<S, R, E, A>
  | Merge<S, R, E, A>
  | EncaseProvider<S, R, E, A>

/**
 * Construct a layer by using a value
 */
export function fromValue<A>(
  _: A,
  inverted?: "regular" | "inverted"
): Layer<never, unknown, never, A> {
  return {
    _tag: "Pure",
    value: _,
    inverted
  }
}

/**
 * Construct a layer by using a value constructed by requiring an environment R2
 */
export function fromValueWith<R2>(
  inverted?: "regular" | "inverted"
): <A>(_: (_: R2) => A) => Layer<never, R2, never, A> {
  return (_) => ({
    _tag: "EncaseEffect",
    effect: T.chain_(T.accessEnvironment<R2>(), (r) => T.pure(_(r))),
    inverted
  })
}

/**
 * Construct a layer by using an effect
 */
export function fromEffect<S, R, E, A>(
  _: T.Effect<S, R, E, A>,
  inverted?: "regular" | "inverted"
): Layer<S, R, E, A> {
  return {
    _tag: "EncaseEffect",
    effect: _,
    inverted
  }
}

/**
 * Construct a layer by using an effect constructed by requiring an environment R2
 */
export function fromEffectWith<R2>(
  inverted?: "regular" | "inverted"
): <S, R, E, A>(_: (_: R2) => T.Effect<S, R, E, A>) => Layer<S, R & R2, E, A> {
  return (_) => ({
    _tag: "EncaseEffect",
    effect: T.chain_(T.accessEnvironment<R2>(), _),
    inverted
  })
}

/**
 * Construct a layer by using a managed
 */
export function fromManaged<S, R, E, A>(
  _: M.Managed<S, R, E, A>,
  inverted?: "regular" | "inverted"
): Layer<S, R, E, A> {
  return {
    _tag: "EncaseManaged",
    managed: _,
    inverted
  }
}

/**
 * Construct a layer by using a managed constructed by requiring an environment R2
 */
export function fromManagedWith<R2>(
  inverted?: "regular" | "inverted"
): <S, R, E, A>(_: (_: R2) => M.Managed<S, R, E, A>) => Layer<S, R & R2, E, A> {
  return (_) => ({
    _tag: "EncaseManaged",
    managed: M.chain_(M.encaseEffect(T.accessEnvironment<R2>()), _),
    inverted
  })
}

/**
 * Construct a layer by using a provider
 */
export function fromProvider<S = never, R = unknown, E = never, A = unknown>(
  provider: T.Provider<R, A, E, S>
): Layer<S, R, E, A> {
  return {
    _tag: "EncaseProvider",
    provider,
    _A: undefined as any,
    _E: undefined as any,
    _R: undefined as any,
    _S: undefined as any
  }
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
  return <SK, RK, EK, AK>(provider: (_: R2) => T.Provider<RK, AK, EK, SK>) => ({
    _tag: "EncaseProvider",
    provider: (eff) => T.accessM((r2: R2) => provider(r2)(eff)),
    _A: undefined as any,
    _E: undefined as any,
    _R: undefined as any,
    _S: undefined as any
  })
}

export type Implementation<C> = C[keyof C]

/**
 * Construct a layer by using a class based constructor
 * requiring additional environment if specified as first parameter in the constructor
 */
export function fromConstructor<C>() {
  return <
    K extends Implementation<C>,
    X extends { new (): K; _tag: keyof C } | { new (deps: any): K; _tag: keyof C }
  >(
    X: X
  ): Layer<
    never,
    UnionToIntersection<
      X extends { new (...args: infer args): K; _tag: keyof C } ? args[number] : never
    >,
    never,
    C
  > =>
    fromProvider(
      T.provideM(
        T.map_(
          T.accessEnvironment<
            UnionToIntersection<
              X extends { new (...args: infer args): K; _tag: keyof C }
                ? args[number]
                : never
            >
          >(),
          (env): C =>
            ({
              [X._tag]: new X(env)
            } as any)
        )
      )
    )
}

export function useEffect<A, S2, R2, E2, A2>(layer: (_: A) => Layer<S2, R2, E2, A2>) {
  return <S, R, E>(
    effect: T.Effect<S, R, E, A>
  ): Layer<S | S2, R & R2, E | E2, A2> => ({
    _tag: "ChainEffect",
    effect,
    layer: layer as any
  })
}

export function useManaged<A, S2, R2, E2, A2>(layer: (_: A) => Layer<S2, R2, E2, A2>) {
  return <S, R, E>(
    managed: M.Managed<S, R, E, A>
  ): Layer<S | S2, R & R2, E | E2, A2> => ({
    _tag: "ChainManaged",
    managed,
    layer: layer as any
  })
}

export type SL<Layers extends Layer<any, any, any, any>[]> = {
  [k in keyof Layers & number]: Layers[k] extends Layer<
    infer _S,
    infer _R,
    infer _E,
    infer _A
  >
    ? _S
    : never
}[number]

export type RL<Layers extends Layer<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Layers & number]: Layers[k] extends Layer<
      infer _S,
      infer _R,
      infer _E,
      infer _A
    >
      ? unknown extends _R
        ? never
        : _R
      : never
  }[number]
>

export type EL<Layers extends Layer<any, any, any, any>[]> = {
  [k in keyof Layers & number]: Layers[k] extends Layer<
    infer _S,
    infer _R,
    infer _E,
    infer _A
  >
    ? _E
    : never
}[number]

export type AL<Layers extends Layer<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Layers & number]: Layers[k] extends Layer<
      infer _S,
      infer _R,
      infer _E,
      infer _A
    >
      ? unknown extends _A
        ? never
        : _A
      : never
  }[number]
>

/**
 * Merge n layers together, the result will require all the environments that each layer requires and will provide all environments that each layer provides
 */
export function merge<Layers extends Layer<any, any, any, any>[]>(
  ...layers: Layers & { 0: Layer<any, any, any, any> }
): Layer<SL<Layers>, RL<Layers>, EL<Layers>, AL<Layers>> {
  return {
    _tag: "Merge",
    layers
  }
}

/**
 * Merges 2 layers vertically, the dependencies of the left are used in the right so the result will only require the difference
 */
export function join<S, R, E, A>(
  left: Layer<S, R, E, A>
): <S2, R2, E2, A2>(
  right: Layer<S2, R2, E2, A2>
) => Layer<S | S2, T.Erase<R & R2, A>, E | E2, A & A2> {
  return (right) => ({
    _tag: "Merge",
    layers: [right as any, left as any]
  })
}

/**
 * Interprets a layer returning a provider function
 */
export function using<S, R, E, A>(layer: Layer<S, R, E, A>): T.Provider<R, A, E, S> {
  return (op) =>
    T.accessM((env: R) => {
      const current = layer
      let currentOp: any = op

      switch (current._tag) {
        case "Pure":
          currentOp = T.provide(current.value, current.inverted)(op)
          break
        case "EncaseEffect":
          currentOp = T.provideM(current.effect, current.inverted)(op)
          break
        case "EncaseManaged":
          currentOp = M.provide(current.managed, current.inverted)(op)
          break
        case "EncaseProvider":
          currentOp = current.provider(op)
          break
        case "ChainEffect":
          currentOp = T.chain_(current.effect, (u) => using(current.layer(u))(op))
          break
        case "ChainManaged":
          currentOp = M.use(current.managed, (u) => using(current.layer(u))(op))
          break
        case "Merge":
          currentOp = A.reduce_(
            current.layers as any,
            op,
            (eff, l) => using(l as any)(eff) as any
          )
          break
      }

      return T.provide(env)(currentOp) as any
    })
}
