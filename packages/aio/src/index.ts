import * as I from "io-ts";
import * as IT from "io-ts-types";
import * as NT from "newtype-ts";
import * as MN from "monocle-ts";
import * as MO from "./morphic";

export {
  I, // io-ts
  IT, // io-ts-types
  NT, // newtype-ts
  MN, // monocle-ts
  MO // morphic-ts
};

export {
  A, // fp-ts Array
  CRef, // Concurrent Reference
  E, // fp-ts augumented Either
  Ex, // Exit
  F, // fp-ts Function
  M, // Managed
  NEA, // fp-ts NonEmptyArray
  O, // fp-ts augumented Option
  Q, // Queue
  RT, // Retry
  Rec, // Recursion Schemes
  Ref, // Reference
  S, // Stream
  SE, // StreamEither
  Sem, // Semaphore
  Service, // FreeEnv Service Definition & Derivation
  T, // Effect
  U, // Type Utils
  P, // Process 
  combineProviders, // Combine Providers
  eq, // fp-ts Eq
  flow, // fp-ts flow
  flowF, // fluent flow - not limited to 10
  magma, // fp-ts Magma
  map, // fp-ts Map
  monoid, // fp-ts Monoid
  pipe, // fp-ts pipe
  pipeF, // fluent pipe - not limited to 10
  record, // fp-ts Record
  semigroup, // fp-ts Semigroup
  set, // fp-ts Set
  show, // fp-ts Show
  tree // fp-ts Tree
} from "@matechs/prelude";
