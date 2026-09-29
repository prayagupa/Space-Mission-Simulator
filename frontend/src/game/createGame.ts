import Phaser from "phaser";
import FlightScene from "./FlightScene";
import type { FlightAssets } from "./flightAssets";
import type { MissionScene } from "../shared/missionPresentation";
import type { MissionDetail } from "../shared/api";

export type FlightGameOptions = {
  assets: FlightAssets;
  environment: MissionScene;
  objective: MissionDetail["objective"];
  reducedMotion: boolean;
  onHud: (data: { fuel: number; hull: number; altitude: number; objective: string; progress: number }) => void;
  onReady: (scene: FlightScene) => void;
  onError: (message: string) => void;
  getInput: () => { thrust: boolean; rotate: number };
};

export function createFlightGame(parent: HTMLElement, options: FlightGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 540,
    backgroundColor: "#060c18",
    antialias: true,
    scene: [FlightScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set("flightOptions", options);
      },
    },
  });
}
