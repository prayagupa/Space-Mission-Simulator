import Phaser from "phaser";
import FlightScene from "./FlightScene";

export type GameCallbacks = {
  onHud: (data: { fuel: number; hull: number; altitude: number; objective: string; progress: number }) => void;
  onEnd: (msg: { type: string; score?: number; medal?: string; status?: string }) => void;
  getInput: () => { thrust: boolean; rotate: number };
};

export function createFlightGame(parent: HTMLElement, callbacks: GameCallbacks): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 540,
    backgroundColor: "#0a0e1a",
    physics: { default: "arcade" },
    scene: [FlightScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set("flightCallbacks", callbacks);
      },
    },
  });
}

export function getFlightScene(game: Phaser.Game): FlightScene | undefined {
  const scene = game.scene.getScene("FlightScene") as FlightScene | undefined;
  return scene?.scene.isActive() ? scene : (game.scene.getScene("FlightScene") as FlightScene);
}
