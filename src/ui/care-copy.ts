// CARD 14. The only place the aftercare words live, so one test can read all of them (D19).
// Rules for anything added here:
// - Never promise that doing a thing changes a reading, a verdict, or how quickly alcohol leaves.
// - Never imply a finish line ("after three waters you are fine"). There is no finish line to give.
// - Say why, in plain words, and keep it to two sentences.
import type { CareTag } from '../engine/aftercare'

export type CareCopy = { title: string; body: string }

export const CARE_COPY: Record<CareTag, CareCopy> = {
  'only-time': {
    title: 'Only time',
    body: 'Nothing you eat or drink speeds up what is already in you. Not water, not coffee, not a cold shower. Only time does that.',
  },
  'water-between': {
    title: 'Water between them',
    body: 'A glass of water between drinks slows the pace of the night. It does not change your reading or remove alcohol already in you.',
  },
  'food-with-it': {
    title: 'Eat something',
    body: 'Have food if you are drinking. It does not undo what you have already had.',
  },
  'caffeine-at-bedtime': {
    title: 'The bedtime estimate',
    body: 'The estimate assumes caffeine halves every five hours, which varies a lot between people. It cannot tell you whether you will sleep.',
  },
}
