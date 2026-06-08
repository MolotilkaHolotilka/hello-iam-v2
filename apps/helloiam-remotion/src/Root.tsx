import "./index.css";
import { Composition } from "remotion";
import {
  IAmLaunch,
  I_AM_LAUNCH_DURATION,
} from "./compositions/IAmLaunch";
import {
  ApricotBounce,
  APRICOT_BOUNCE_DURATION,
} from "./compositions/ApricotBounce";
import {
  GreenPlateIntro,
  GREEN_PLATE_INTRO_DURATION,
  GREEN_PLATE_CARD_DURATION,
  GreenPlateCard70,
  GreenPlateCard71,
  GreenPlateCard75,
} from "./compositions/GreenPlateIntro";
import {
  DEFAULT_TEMPLATE_PROPS,
  TEMPLATE_RENDER_DURATION,
  TEMPLATE_RENDER_PORTRAIT_DURATION,
  TemplateRenderer,
} from "./templates/TemplateRenderer";
import type {TemplateRenderProps} from "./templates/types";

function templateCompositionMetadata(props: TemplateRenderProps) {
  const cardCount = props.workflow?.cardCount ?? 7;
  const perCard = props.workflow?.durationPerCardFrames ?? 90;
  const fps = props.workflow?.fps ?? 30;
  return {
    durationInFrames: Math.max(1, perCard * cardCount),
    fps,
  };
}

const GREEN_PLATE_PORTRAIT_PROPS = {
  templateId: "green-plate-intro",
  format: "carousel-portrait",
  animationPreset: "clean-rise" as const,
  workflow: { cardCount: 3 },
  card1: {
    title: "Hello,\nI Am",
    titleAccent: "GREEN\nPLATE",
    label: "AM FOOD",
    image: "generated/emoji-greens.png",
    background: "#d61e23",
    titleColor: "#ffffff",
    accentColor: "#ffce1f",
  },
  card2: {
    title: "Hello, I Am\nGREEN PLATE",
    image: "generated/lavash.png",
    quote: "Start with bread. Lavash is foundation, gesture, and memory.",
    label: "AM FOOD",
    background: "#d9dde0",
    quoteColor: "#d61e23",
  },
  card3: {
    brandLeft: "helloiam",
    brandRight: "am",
    image: "generated/emoji-greens.png",
    background: "#d9dde0",
    brandColor: "#420000",
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ApricotBounce"
        component={ApricotBounce}
        durationInFrames={APRICOT_BOUNCE_DURATION}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="HelloIamPost001"
        component={IAmLaunch}
        durationInFrames={I_AM_LAUNCH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="GreenPlateIntro"
        component={GreenPlateIntro}
        durationInFrames={GREEN_PLATE_INTRO_DURATION}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="GreenPlateCard70"
        component={GreenPlateCard70}
        durationInFrames={GREEN_PLATE_CARD_DURATION}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="GreenPlateCard71"
        component={GreenPlateCard71}
        durationInFrames={GREEN_PLATE_CARD_DURATION}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="GreenPlateCard75"
        component={GreenPlateCard75}
        durationInFrames={GREEN_PLATE_CARD_DURATION}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="TemplateRender"
        component={TemplateRenderer}
        durationInFrames={TEMPLATE_RENDER_DURATION}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={DEFAULT_TEMPLATE_PROPS}
      />
      <Composition
        id="TemplateRenderPortrait"
        component={TemplateRenderer}
        durationInFrames={TEMPLATE_RENDER_PORTRAIT_DURATION}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={GREEN_PLATE_PORTRAIT_PROPS}
        calculateMetadata={({props}) =>
          templateCompositionMetadata(props as TemplateRenderProps)
        }
      />
    </>
  );
};
