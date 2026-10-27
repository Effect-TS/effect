import type * as DecisionModel from "effect/ai/DecisionModel"
import * as Base64 from "effect/encoding/Base64"
import type * as CloudflareSchema from "../CloudflareSchema.ts"

export const hasRemoteUrl = (images: ReadonlyArray<DecisionModel.Image> | undefined): boolean =>
  images?.some((image) => image.data instanceof URL && image.data.protocol !== "data:") ?? false

export const encodeImage = (image: DecisionModel.Image): typeof CloudflareSchema.Image.Encoded =>
  image.data instanceof URL ? image.data.href : {
    content_type: image.mediaType,
    base64: typeof image.data === "string" ? image.data : Base64.encode(image.data)
  }
