export interface CustomType<P extends string, V> {
  CustomType: {
    [p in P]: () => V
  }
}

export type Custom<C, P extends string, D = any> = C extends CustomType<P, infer V>
  ? V
  : D

export type CustomConstrained<C, P extends string, D = any> = C extends CustomType<
  P,
  infer V
>
  ? V extends D
    ? V
    : D
  : D
