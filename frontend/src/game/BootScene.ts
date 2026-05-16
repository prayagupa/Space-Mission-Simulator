import Phaser from "phaser";

/** Lightweight starfield for menu background. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0e1a");
    for (let layer = 0; layer < 3; layer++) {
      const g = this.add.graphics();
      const alpha = 0.3 + layer * 0.25;
      g.fillStyle(0x88aacc, alpha);
      const speed = 0.1 + layer * 0.15;
      for (let i = 0; i < 60; i++) {
        g.fillCircle(
          Phaser.Math.Between(0, this.scale.width),
          Phaser.Math.Between(0, this.scale.height),
          1 + layer * 0.5
        );
      }
      g.setScrollFactor(speed);
    }

    const ship = this.add.graphics();
    ship.fillStyle(0x00d4ff, 0.8);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    ship.fillTriangle(cx, cy - 30, cx - 18, cy + 20, cx + 18, cy + 20);
    this.tweens.add({
      targets: ship,
      y: 12,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
}
