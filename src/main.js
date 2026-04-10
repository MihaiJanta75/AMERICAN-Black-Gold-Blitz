import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import { removeLoadingScreen } from './loadingScreen.js';

const config = {
  type: Phaser.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: document.body,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
  scene: [BootScene, GameScene],
  banner: false,
};

try {
  const game = new Phaser.Game(config);
} catch (err) {
  console.error('Failed to initialize Phaser:', err);
  removeLoadingScreen();
}

// Fallback: remove loading screen after 6s regardless, in case Phaser fails silently
setTimeout(() => removeLoadingScreen(), 6000);
