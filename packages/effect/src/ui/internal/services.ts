/**
 * Service keys shared by the public modules and the runtime.
 *
 * @internal
 */
import * as Context from "../../Context.ts"
import type { Refs as RefsShape, Renderer as RendererShape } from "../Renderer.ts"

/** @internal */
export const Renderer = Context.Service<RendererShape, RendererShape>("effect/ui/Renderer")

/** @internal */
export const Refs = Context.Service<RefsShape, RefsShape>("effect/ui/Renderer/Refs")
