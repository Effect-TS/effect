import { Html } from "@effect/ui-html"
import { View } from "effect/ui"

declare module "effect/ui/View" {
  interface Register {
    readonly elements: Html.Elements
  }
}

View.registerElements(Html)