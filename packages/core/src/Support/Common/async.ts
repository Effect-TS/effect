import type { Either } from "../../Either"
import type { FunctionN } from "../../Function"

export type AsyncContFn<E, A> = FunctionN<[Either<E, A>], void>

export type AsyncCancelContFn = FunctionN<[(...errors: unknown[]) => void], void>

export type AsyncFn<E, A> = FunctionN<[AsyncContFn<E, A>], AsyncCancelContFn>
