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
    body: 'A glass of water between drinks. It will not change your reading, but tomorrow will be kinder.',
  },
  'food-with-it': {
    title: 'Eat something',
    body: 'Food slows how fast alcohol arrives. That helps with the next one, not the last one.',
  },
  'food-ideas': {
    title: 'While you wait',
    body: 'Water, something salty, and fruit with water in it: watermelon, orange, a banana. You are replacing fluid and salt, not undoing anything.',
  },
  'alcohol-and-sleep': {
    title: 'About tonight',
    body: 'Alcohol gets you to sleep faster and then breaks up the second half of the night. Expect to wake early.',
  },
  'water-with-caffeine': {
    title: 'A glass alongside',
    body: 'Caffeine is a mild diuretic, so keep a glass of water next to it.',
  },
  'caffeine-over-limit': {
    title: 'Over the daily guide',
    body: 'That is past 400 mg today, which is the usual daily guide for adults.',
  },
  'caffeine-at-bedtime': {
    title: 'Still with you at bedtime',
    body: 'Caffeine halves about every five hours, so an afternoon cup is still partly on board at midnight.',
  },
}
