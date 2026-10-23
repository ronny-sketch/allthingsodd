# Tasks: ODDspace membership enquiry

From `DESIGN_BRIEF.md` and `INFORMATION_ARCHITECTURE.md`. Backend first, as
the deploy order requires.

## Growth OS (`../odd-growth-os`, branch `feat/membership-slack`)

- [x] 1. `worker/src/membership/schema.ts`: `link` required; `phone` required for
      trial day; `start`/`use` required only for `ready`; team, size and studio
      only for `ready`; category from visit. Tests updated.
- [x] 2. `mapping.ts` / `emails.ts` / `slack.ts`: cope with absent start/use
      (empty Notion cells, no "Start:" line in the team email or Slack post).
- [x] 3. `npm test`, deploy staging, curl the 400s for each path.

## Website (`allthingsodd`, branch `feat/membership-intake`)

- [x] 4. `membership-schema.ts`: same rules per path; `READY_STARTS`;
      `stepOf(field)` for error routing; card copy.
- [x] 5. `MembershipForm.astro`: opener section + `<dialog>` shell (header,
      counter, progress, close), three steps with path variants, footer,
      done screen, sticky bar. Styles from the booking dialog, light page.
- [x] 6. `membership-form.ts`: open/close (hash, history, Esc), step engine
      with per-path step 2, per-step validation, card tap advances, picker
      in the dialog, picks as removable chips, send with the Worker's own
      messages, error routing to the step, analytics events.
- [x] 7. Page wiring: `#join` / `#join-visit` links open the dialog; sticky bar
      visibility; done state in the section.
- [x] 8. `tests/functional/membership-form.spec.ts` rewritten for the dialog
      and the four paths.
- [ ] 9. `npm run quality`, local check in the dev preview (phone and desktop
      widths), commit; Fernando pushes; CI; test on the preview in a normal
      browser.
