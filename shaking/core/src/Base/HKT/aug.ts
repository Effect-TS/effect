import type {
  URItoKind as U1,
  URItoKind2 as U2,
  URItoKind3 as U3,
  URItoKind4 as U4
} from "./index"

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> extends U1<A> {}
  interface URItoKind2<E, A> extends U2<E, A> {}
  interface URItoKind3<R, E, A> extends U3<R, E, A> {}
  interface URItoKind4<S, R, E, A> extends U4<S, R, E, A> {}
}
