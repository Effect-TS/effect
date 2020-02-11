import * as R from "../../../lib";
import { FlashStateEnv, flashStateURI } from "./state";

export const flashMessage = (message: string) =>
  R.accessS<FlashStateEnv>()(({ [flashStateURI]: { messages } }) => {
    messages.push(message);
  });
