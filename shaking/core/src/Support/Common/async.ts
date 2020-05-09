import { Either } from "fp-ts/lib/Either"
import { FunctionN } from "fp-ts/lib/function"

export type AsyncContFn<E, A> = FunctionN<[Either<E, A>], void>

export type AsyncCancelContFn = FunctionN<[(...errors: Error[]) => void], void>

export type AsyncFn<E, A> = FunctionN<[AsyncContFn<E, A>], AsyncCancelContFn>
