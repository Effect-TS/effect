// ets_tracing: off

export interface CustomType<P extends string, V> {
  CustomType: {
    [p in P]: () => V
  }
}

export type AccessCustom<C, P extends string, D = any> = C extends CustomType<
  P,
  infer V
>
  ? V
  : D

export type AccessCustomExtends<C, P extends string, D = any> = C extends CustomType<
  P,
  infer V
>
  ? V extends D
    ? V
    : D
  : D
