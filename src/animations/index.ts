import A0 from './01-tetris.astro';
import A1 from './02-scatter.astro';
import A2 from './03-led-glow.astro';
import A3 from './04-rain.astro';
import A4 from './05-flip.astro';
import A5 from './06-equalizer.astro';
import A6 from './07-pulse.astro';
import A7 from './08-typewriter.astro';
import A8 from './09-pac-man.astro';
import A9 from './10-wave.astro';
import A10 from './11-marquee.astro';
import A11 from './12-twinkle.astro';
import A12 from './13-radar.astro';
import A13 from './14-crumble.astro';
import A14 from './15-sand.astro';
import A15 from './16-slots.astro';
import A16 from './17-magnet.astro';

export interface Animation {
  id: string;
  name: string;
  Component: any;
}

/** Every pixel animation from the studies file, in study order. */
export const animations: Animation[] = [
  { id: 'tet', name: "Tetris", Component: A0 },
  { id: 'scatter', name: "Scatter", Component: A1 },
  { id: 'led', name: "LED glow", Component: A2 },
  { id: 'rain', name: "Rain", Component: A3 },
  { id: 'flip', name: "Flip", Component: A4 },
  { id: 'eq', name: "Equalizer", Component: A5 },
  { id: 'pls', name: "Pulse", Component: A6 },
  { id: 'tw', name: "Typewriter", Component: A7 },
  { id: 'pac', name: "Pac-Man", Component: A8 },
  { id: 'wav', name: "Wave", Component: A9 },
  { id: 'mq', name: "Marquee", Component: A10 },
  { id: 'twinkle', name: "Twinkle", Component: A11 },
  { id: 'rdr', name: "Radar", Component: A12 },
  { id: 'crm', name: "Crumble", Component: A13 },
  { id: 'snd', name: "Sand", Component: A14 },
  { id: 'slt', name: "Slots", Component: A15 },
  { id: 'mgs', name: "Magnet", Component: A16 },
];
