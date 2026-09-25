// The venue rate calculator's choices, in words (2026-09-24). The calculator
// on /oddspace/venue (VenueRateCalculator.astro, venue-rate-calculator.ts)
// adds ?lane=&offer= to its enquiry link, so the first reply can be about
// the date instead of re-establishing who someone is. Two forms read them
// back: the ODDspace booking enquiry (booking-enquiry-form.ts), which is
// where the calculator's button leads, and the Work with ODD form
// (work-enquiry-form.ts), for older links.
//
// Both values are looked up here and never echoed into the page as text: a
// link is something a stranger can write, and the phrase ends up in a text
// box whose contents a human at ODD then reads as if we had asked for it. An
// unknown value simply adds nothing.
export const LANE_PHRASES: Record<string, string> = {
  member: 'as an ODDspace member',
  creative: 'as a creative organisation',
  company: 'as a company or organisation',
};
export const OFFER_PHRASES: Record<string, string> = {
  half: 'a half day',
  full: 'a full day or evening',
  flat: 'the flat fee for the room',
  share: 'the revenue share, nothing upfront',
};

// "as a creative organisation, the revenue share, nothing upfront", or ''
// when the lane is not one of ours.
export function lanePhrase(lane: string | null, offer: string | null): string {
  const l = LANE_PHRASES[lane ?? ''];
  if (!l) return '';
  const o = OFFER_PHRASES[offer ?? ''];
  return o ? `${l}, ${o}` : l;
}
