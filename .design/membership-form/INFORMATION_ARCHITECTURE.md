# Information Architecture: ODDspace membership enquiry

Reads with `DESIGN_BRIEF.md`. 21 October 2026.

## Where it lives

`/oddspace/membership`. No new route. The section at `#join` stays as the
page's last section (eyebrow, headline, body from `finalCta` in
`oddspace-membership.json`) and now holds one button that opens the dialog.

| Entry                                                        | Opens at | Visit pre-chosen |
| ------------------------------------------------------------ | -------- | ---------------- |
| Any link to `#join` (hero "Apply", tier cards, final CTA)    | Step 1   | none             |
| Any link to `#join-visit` ("Come and see it first")          | Step 2   | Look round       |
| "Book a visit" in the `#join` section                        | Step 1   | none             |
| Sticky bar on phones, "Book a visit"                         | Step 1   | none             |
| Arriving on the page with `#join` / `#join-visit` in the URL | as above | as above         |

Closing: ×, Esc, the browser's back button (the dialog pushes one history
entry), or "Close" on the done screen. Answers stay until reload.

## The flow

```
                 ┌─────────────────────────────┐
                 │ 01 How would you like to     │
                 │    see ODDspace?             │
                 │  [Look round] [Coffee]       │
                 │  [Trial day]  [Ready to join]│
                 └──────────────┬──────────────┘
          tap a card → moves on │
      ┌───────────────┬─────────┴──────┬──────────────────┐
      ▼               ▼                ▼                  ▼
 02 When suits    02 Which Mondays  02 Which days?    02 Your membership
    you?             could you come?   (up to 3)         start · use ·
  days → times     Mondays (up to 3)                     team(+size) ·
  (up to 3)                                              ODDstudio (?)
      └───────────────┴────────┬───────┴──────────────────┘
                               ▼
                 03 About you
                    name · email · works on · link
                    phone (trial day: required; coffee: not asked)
                    how you heard (ready only) · anything else
                    consent · newsletter
                               ▼
                 Send → done screen (in the dialog)
```

Every path is three steps; the counter reads "Step n of 3".

## Screens and fields

`*` required. Field names are the payload keys the Worker reads.

### Step 1: How would you like to see ODDspace?

`visit*`, four radio cards. Selecting one goes to step 2 after a short beat;
Next also works. Changing the visit later clears `times`.

| value       | Card title             | Card line                                                                       |
| ----------- | ---------------------- | ------------------------------------------------------------------------------- |
| `viewing`   | A 30-minute look round | A weekday between 10:00 and 17:00. We show you round and answer your questions. |
| `coffee`    | Monday coffee, 09:00   | Coffee on the House: free coffee and a DJ, then a look round.                   |
| `trial_day` | A free trial day       | Work here for a day. We meet you at 10:00 and let you in.                       |
| `ready`     | I'm ready to join      | Skip the visit. We email you about a start date and the next steps.             |

### Step 2 (look round): When suits you?

`times*` (1–3). Hint: "Pick up to three. Helsinki time. Someone from the team
takes one of them and confirms it by email." Day row, then that day's half
hours. Picks below as removable chips: "Your picks (2 of 3)".

### Step 2 (coffee): Which Mondays could you come?

`times*` (1–3 Mondays, from 09:00). Hint: "Coffee runs 09:00–10:00. Now and
then it pops up at another Helsinki space; if your Monday is one of those,
we'll tell you and suggest another."

### Step 2 (trial day): Which days could you come?

`times*` (1–3 weekdays, from 10:00). Hint: "Pick up to three. Someone from
the team takes one, meets you at 10:00 and lets you in."

### Step 2 (ready to join): Your membership

- `start*` "When would you like to start?" This month · Next month · Later
  this year. ("Just curious" is not offered on this path.)
- `use*` "How would you use ODDspace?" Most weekdays · A couple of days a
  week · Meeting rooms now and then.
- `team` tick "We're a team" → `team_size*` "How many of you?" (2–30).
- `studio` tick "I'd want ODDstudio too", with "What's ODDstudio?":

  > ODDstudio is the creative music studio inside ODDspace, run with
  > TUNEMENT: Genelec monitoring, mics, instruments and room to work as a
  > group. Add full access for €100 / month on top of membership, or book it
  > at €20 / hour as a member. [Read about ODDstudio](/oddstudio/)

  (Copy and prices from `oddspace-membership.json` and `oddstudio.json`.)

### Step 3: About you

| Field                                                   | Look round | Coffee    | Trial day | Ready    |
| ------------------------------------------------------- | ---------- | --------- | --------- | -------- |
| `name` Your name                                        | *          | *         | *         | *        |
| `email` Email                                           | *          | *         | *         | *        |
| `works_on` What do you work on? (one line)              | *          | *         | *         | *        |
| `link` A link to your work                              | *          | *         | *         | *        |
| `phone` Phone                                           | optional   | not asked | *         | optional |
| `heard` How did you hear about ODDspace?                |            |           |           | optional |
| `notes` Anything else?                                  | optional   | optional  | optional  | optional |
| `consent_privacy` Keep my answers so the team can reply | *          | *         | *         | *        |
| `newsletter` Also send me ODD's newsletter              | optional   | optional  | optional  | optional |

Hints: link "Website, portfolio, Instagram, SoundCloud: whatever shows what
you make."; phone (trial day) "So whoever lets you in can reach you on the
day."

Next becomes **Send** on this step.

### Done (in the dialog)

Eyebrow "Got it". Title "Thanks, {first name}." Body by path:

- Look round: "Someone from the team will take one of your times and confirm
  it by email, usually within one working day."
- Coffee: "Someone from the team will confirm which Monday by email, look out
  for you at coffee and show you round."
- Trial day: "Someone from the team will confirm one of your days by email,
  then meet you at 10:00 to let you in."
- Ready: "Someone from the team will email you within one working day about a
  start date and the next steps."

Then "Your reference: ABCD1234. If anything changes, email hello@oddfest.co."
and a Close button. After closing, the `#join` section shows the same one-line
confirmation in place of the button, and the sticky bar is gone.

## Error routes

| Source                            | Shown                                                                                         | Goes to                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Next with a missing or bad answer | Under the field; focus to the first                                                           | stays                                                                                                        |
| Worker 400 `invalid`              | Under each field                                                                              | the earliest step holding one: `visit` → 1; `times`, `start`, `use`, `team_size`, `studio` → 2; the rest → 3 |
| Worker 400 `times` (a time went)  | "One of those times is no longer available. Please pick again." Picks cleared, picker rebuilt | 2                                                                                                            |
| Worker 403 (bot check)            | The Worker's `message`                                                                        | stays, Send again                                                                                            |
| Worker 409 conflict               | As now (new id, Send again)                                                                   | stays                                                                                                        |
| 429                               | "Too many tries…"                                                                             | stays                                                                                                        |
| Network / anything else           | "Something went wrong and this may not have reached us…"                                      | stays                                                                                                        |

## Payload by path (what the Worker must accept)

| Key                           | Look round     | Coffee         | Trial day      | Ready       |
| ----------------------------- | -------------- | -------------- | -------------- | ----------- |
| `visit`, `times`              | viewing, 1–3   | coffee, 1–3    | trial_day, 1–3 | ready, []   |
| `start`, `use`                | absent         | absent         | absent         | required    |
| `team`, `team_size`, `studio` | false / absent | false / absent | false / absent | as answered |
| `link`                        | required       | required       | required       | required    |
| `phone`                       | optional       | absent         | required       | optional    |
| `heard`                       | absent         | absent         | absent         | optional    |

Category (Worker): `ready` → ready, except start "later" → warm; trial day,
look round and coffee → warm. (Explorer is no longer produced by this form;
it stays valid for old rows.)

## Analytics (GA4, consent-gated as now)

`membership_form_open {entry}`, `membership_step {step, visit}`,
`membership_submit {visit, outcome, times}`,
`membership_submit_error {visit, error_kind}`. `membership_cta_click` folds
into `membership_form_open`. No personal data in events.
