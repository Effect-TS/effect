import { summon, AsOpaque } from "@morphic-ts/batteries/lib/summoner-no-union";
import { AType, EType } from "@morphic-ts/batteries/lib/usage/utils";
import { effect as T } from "@matechs/effect";
import { State } from "../../../lib";

const FlashState_ = summon(F =>
  F.interface(
    {
      messages: F.array(F.string())
    },
    "FlashMessage"
  )
);

export interface FlashState extends AType<typeof FlashState_> {}
export interface FlashStateR extends EType<typeof FlashState_> {}
export const FlashState = AsOpaque<FlashStateR, FlashState>(FlashState_);

export const flashInitialState = T.pure(
  FlashState.build({
    messages: []
  })
);

export const flashStateURI = "@example/flash";

export interface FlashStateEnv
  extends State<{
    [flashStateURI]: FlashState;
  }> {}
