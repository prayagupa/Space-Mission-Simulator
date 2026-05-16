import { useEffect, useRef } from "react";
import Phaser from "phaser";
import BootScene from "../game/BootScene";

export default function StarfieldCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!ref.current || gameRef.current) return;
    gameRef.current = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: ref.current,
      width: ref.current.clientWidth || 800,
      height: 220,
      transparent: true,
      scene: [BootScene],
      scale: { mode: Phaser.Scale.RESIZE },
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ width: "100%", maxWidth: 900, height: 220, margin: "0 auto", borderRadius: 12, overflow: "hidden" }}
    />
  );
}
