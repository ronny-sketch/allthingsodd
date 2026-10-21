# Design Brief: ODDspace membership enquiry

21 October 2026. Replaces the inline form at `#join` on `/oddspace/membership`
(PR #172, first version). Decisions from the grill on 21 Oct with Fernando.

## Problem

Someone is curious about working at ODDspace. They want to see the place
before committing €150 a month, and they want that to be easy: pick a time,
say who they are, done. The first version asked everyone the same eleven
questions, including "When would you like to start?" right after they had
said "I'd like a 30-minute look round first". It felt like an application
when they had only asked to visit. "I'd want ODDstudio too" assumed they knew
what ODDstudio is. And on a phone it was one long scroll.

## Solution

A short guided enquiry in a full-screen dialog, the same shape as the venue's
"Get a quote" (BookingEnquiryForm). The first question is how they would like
to see ODDspace: four cards. Their answer decides everything after it. A visit
asks only when, then who you are: three steps. "Ready to join" skips the
visit and asks the few things a start date depends on instead. A progress bar
shows how far they are, and one Send on the last step finishes it. A teammate
claims one of their times in Slack and confirms by email.

## Experience Principles

1. **Ask for what this path needs, nothing else.** A visit is not an
   application. Start date, usage, team and studio are asked only of
   "Ready to join". Everything else is "Anything else?".
2. **One decision per screen, on a phone first.** Each step fits a phone
   screen without hunting; big tap targets; the keyboard type matches the
   field.
3. **Same house, same door.** It should feel like the venue enquiry a visitor
   may already know: same dialog, progress bar, step numbering, Back/Next and
   done screen. Reuse the pattern rather than inventing a second one.

## Aesthetic Direction

- **Philosophy**: ODD's own system, "Signal & Ember / Field Guide": confident
  type, hairlines, pill buttons, numbered steps (01, 02…).
- **Tone**: warm, direct, a little odd. Short sentences. It's an invitation
  to come round, not a vetting form.
- **Reference points**: the venue page's "Get a quote" dialog on
  allthingsodd.co/oddspace/venue; Typeform's one-thing-at-a-time pacing.
- **Anti-references**: a long HR-style application; a SaaS signup wizard
  with marketing upsells; a calendar-booking widget (Calendly) chrome.

## Existing Patterns

- Typography: Forta (display) and Gabarito (body), the five-role ladder in
  `src/styles/typography.css`; no one-off sizes.
- Colors: tokens in `src/styles/tokens.css`. The membership page is
  `theme="light"`; the dialog follows the booking dialog's surface.
  Errors in `--color-heat`.
- Spacing: `--space-*` scale; `--space-content` / `--space-group` rhythm.
  No block margins between siblings (layout via gap).
- Shapes: `--radius-pill` for buttons and chips, `--radius-panel` for the
  dialog, square for content.
- Lists: no bullet dot, ever. Separator "·", list marker a hairline dash.
- Components: `Pill`, `ChoiceChips`, the booking dialog's header, progress,
  step, footer and done markup and its step-transition motion (with the
  reduced-motion branch); `bk-more` details disclosure for explainers.

## Component Inventory

| Component                                                               | Status            | Notes                                                                                          |
| ----------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Page section at `#join` (heading, body, "Book a visit" button, note)    | Modify            | Becomes the opener; the form moves into the dialog                                             |
| Full-screen `<dialog>` shell, header, progress bar, step counter, close | Reuse pattern     | Copy of the booking dialog's, as CreativeWeekForm did; not a shared component yet              |
| Visit cards (4)                                                         | New               | Radio cards: title + one line; one tap moves on                                                |
| Day and time picker                                                     | Exists            | Moves into step 2 unchanged in logic; restyled to the dialog                                   |
| "Your picks" list                                                       | Modify            | Picks shown as removable chips                                                                 |
| Membership step (start, use, team + size, ODDstudio)                    | Modify            | Ready-to-join only                                                                             |
| "What's ODDstudio?" explainer                                           | New               | `details` disclosure like "More about this room", copy from the ODDstudio and membership pages |
| About-you fields                                                        | Modify            | Name, email, works on, link (all required), phone (required for trial day)                     |
| Consent + newsletter ticks                                              | Exists            | Move to the last step                                                                          |
| Footer: Back, Next/Send, status line                                    | Reuse pattern     | Next becomes "Send" on the last step                                                           |
| Done screen                                                             | Modify            | In the dialog, path-specific copy and reference                                                |
| Sticky bar on phones                                                    | New for this page | "See ODDspace first · Book a visit", hides while the dialog is open and after sending          |

## Key Interactions

- **Opening.** Every "Apply for membership" (`#join`) and "Come and see it
  first" (`#join-visit`) link opens the dialog. `#join-visit` opens on step 2
  with the look round chosen. Esc, × and the browser's back button close it.
  Answers stay until the page is reloaded.
- **Step 1, the visit.** Tapping a card selects it and moves to the next step
  (no Next needed). Changing it later clears picks that no longer apply.
- **Paths and step counts.**
  - Look round: 1 Visit, 2 Times, 3 About you. 3 steps.
  - Monday coffee: 1 Visit, 2 Mondays, 3 About you. 3 steps.
  - Trial day: 1 Visit, 2 Days, 3 About you (+ phone). 3 steps.
  - Ready to join: 1 Visit, 2 Membership, 3 About you. 3 steps.
  - The counter and bar show "Step n of 3" for every path.
- **Times.** As now: days across, then that day's times; up to three picks
  across days; picks listed as chips that can be removed. Next is checked
  only for "at least one pick".
- **Validation.** On Next, only that step's fields are checked; errors sit
  under each field and focus moves to the first one. The Worker's own field
  errors on Send take the visitor back to the step that holds that field.
- **Sending.** Send shows "Sending…", then the done screen in the dialog.
  Failure messages use the Worker's own words (for example the bot check's
  "We couldn't confirm this came from a person…") rather than a generic line.
  The answers stay, and Send can be pressed again with the same submission id.
- **ODDstudio.** "What's ODDstudio?" opens a short explainer in place.
- **No newsletter popup.** Once the enquiry has been opened, the timed
  newsletter popup stays away for the rest of the page view (21 Oct
  feedback); the form has its own newsletter tick.

## Responsive Behavior

- Phone first: the dialog fills the screen; the header (title, counter, ×,
  bar) and the footer (Back, Next) are fixed, and the body scrolls between
  them. Visit cards stack; time chips wrap; About-you fields are one column.
- From tablet up: the dialog is a centred panel of reading width; About-you
  becomes two columns for name and email.
- The sticky bar shows on phones only, below the hero, and never covers the
  dialog or the footer.

## Accessibility Requirements

- Native `<dialog>` with `aria-labelledby`; focus moves to the step heading on
  each step; focus returns to the opener on close.
- Visit cards are real radio inputs in a fieldset with a legend; the time
  picker keeps `aria-pressed` and `aria-current`.
- Every field has a visible label; required fields marked `*` with the
  sr-only explanation, as on the booking form; errors linked with
  `aria-describedby`.
- Step counter `aria-live="polite"`; status line `role="status"`.
- Contrast at least 4.5:1 for text (use `--color-signal-bright` /
  `--color-amber-bright` where colour carries text); 44 px touch targets.
- Reduced motion: no step slide.

## Data contract changes (Growth OS)

The Worker validates the same rules, so `../odd-growth-os` changes in step:

- `link` becomes required for every path.
- `phone` is required when `visit` is `trial_day`.
- `start` and `use` are required only when `visit` is `ready`; `team`,
  `team_size` and `studio` are sent only for `ready`.
- Category (ready / warm / explorer) is derived from the visit when `start`
  is not asked: ready → ready, trial day → warm, look round and coffee →
  warm, unless "Ready to join" says "just curious".
- Notion columns stay; unanswered ones stay empty.

Deploy order as always: Worker (staging) first, then the website.

## Open questions

- **Coffee venue.** The ODDspace page says Coffee on the House "some Mondays
  pops up at another Helsinki space". On those Mondays a visitor can't be
  shown round. Leave those Mondays out of the picker (needs a list), or say so
  in the coffee card's hint? Default: a hint line, until there is a list.

## Out of Scope

- Moving the CRM to Attio (Notion stays the test pipeline).
- A Finnish version of the form.
- Calendar integration with the team's availability (Slack claim stays the
  mechanism).
- Changes to the membership page's other sections.
- A shared dialog component for booking, Creative Week and membership.
