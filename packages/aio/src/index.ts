import * as I from "./iots"
import * as MO from "./morphic"

export {
  I, // io-ts & io-ts-types
  MO // morphic-ts
}

export {
  A, // Array
  CRef, // Concurrent Reference
  E, // augumented Either
  Ex, // Exit
  Fn as F, // Function
  M, // Managed
  Nea as NEA, // NonEmptyArray
  O, // augumented Option
  Q, // Queue
  Ret as RT, // Retry
  RS as Rec, // Recursion Schemes
  Ref, // Reference
  S, // Stream
  SE, // StreamEither
  Sem, // Semaphore
  Ser as Service, // FreeEnv Service Definition & Derivation
  T, // Effect
  U, // Type Utils
  Pr as P, // Process
  EO, // EffectOption
  combine as combineProviders, // Combine Providers
  Eq as eq, // Eq
  flow, // flow
  flowF, // fluent flow - not limited to 10
  Mg as magma, // Magma
  Mp as map, // Map
  Mn as monoid, // Monoid
  pipe, // pipe
  pipeF, // fluent pipe - not limited to 10
  Re as record, // Record
  Sg as semigroup, // Semigroup
  Ord as ord, // Order
  St as set, // Set
  Sh as show, // Show
  Tr as tree, // Tree
  Bo as boolean, // boolean,
  Mc as MN,
  NT
} from "@matechs/core/Prelude"
