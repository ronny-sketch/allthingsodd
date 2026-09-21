# Launch runbook — All Things ODD

One authoritative sequence for putting `allthingsodd.co` and its commercial
systems into production. Written 2026-09-21.

This is the operational half. The assessment that produced it — what was
found, what was fixed, what is still blocked and why — is
`docs/LAUNCH_READINESS_2026-09-21.md`. Read that first if you are deciding
_whether_ to launch. Read this when you have decided _to_.

Two systems launch together and they deploy independently:

| System           | Repository                             | Deploy                                    | Live at                                         |
| ---------------- | -------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Website          | `ronny-sketch/allthingsodd`            | CI, automatically on every push to `main` | `https://allthingsodd.co`                       |
| Growth OS Worker | `ronny-sketch/odd-growth-os` (private) | `npx wrangler deploy`, by hand            | `https://odd-field-guide.ronny-507.workers.dev` |

**The website deploys itself. The Worker does not.** A push to `main` in the
website repo is a production action with no confirmation step. A change to the
Worker is not live until a human runs `wrangler deploy`, and the two can drift
apart — they have before.

---

## Roles

Fill these in before you start. A runbook with an unnamed owner has no owner.

| Role                   | Who   | What they hold                                               |
| ---------------------- | ----- | ------------------------------------------------------------ |
| Code freeze owner      | Ronny | The last commit that ships. Says no to anything after it.    |
| Content freeze owner   | Ronny | Nothing merges from CloudCannon after this point.            |
| Legal/factual approver | Ronny | Signs off prices, dates, refund terms, accessibility claims. |
| Stripe monitor         |       | Watches the dashboard for the first hour.                    |
| Inbox monitor          |       | Watches `hello@oddfest.co` for form deliveries and bounces.  |
| Attio monitor          |       | Confirms enquiries land and do not duplicate.                |
| Rollback authority     | Ronny | The only person who decides to roll back.                    |

---

## Before launch

Work top to bottom. Anything unticked is a launch decision, not an oversight.

### 1. Freeze and fingerprint

```bash
cd allthingsodd
git checkout main && git pull --ff-only
git log --oneline -1          # record this SHA; it is what you are launching
git status --short            # must be empty
```

```bash
cd ../odd-growth-os
git checkout main && git pull --ff-only
git log --oneline -1
git log --since=2026-09-14T11:06Z -- worker/ wrangler.toml package*.json
```

That last command matters. The Worker was last deployed 2026-09-14 11:06 UTC.
Anything it lists is on `main` but **not live**. Deploying the website without
deploying the Worker ships a frontend against an older backend.

### 2. Required approvals

- [ ] Every `BLOCKED — VERIFIED FACT REQUIRED` row in the readiness report is
      either resolved or accepted as launching-without.
- [ ] Every `BLOCKED — HUMAN DECISION` row has a decision.
- [ ] Ticket sale state is a deliberate choice, not a default. See
      **Ticketing** below.

### 3. Quality gates

```bash
cd allthingsodd
npm ci
npm run quality                      # check, lint, format, cloudcannon, identity,
                                     # brand tokens, served extensions, og images, build
npx astro preview --background
npm test                             # full Playwright suite, all 12 projects
node scripts/measure-cwv.mjs         # every route must be inside budget
```

```bash
cd ../odd-growth-os
npm ci && npm run check && npm test
```

Visual-regression baselines are macOS-only and CI does not run them (see
`docs/deployment.md#ci-history`), so `npm test` locally is the only place they
are checked. Two routes — `/oddference` and `/oddspace` — are known to fail
their own committed baselines intermittently on an unmodified `main`. Confirm
a diff reproduces before believing it.

### 4. Domains and TLS

```bash
for u in https://allthingsodd.co/ https://www.allthingsodd.co/ \
         http://allthingsodd.co/ https://odd-field-guide.surge.sh/ ; do
  curl -sS -o /dev/null -L -w "%{http_code}  %{num_redirects} hops  %{url_effective}\n" "$u"
done
```

Expected: apex 200; `www` 301 to the apex over a **valid** certificate; plain
HTTP 301 to HTTPS; the legacy Surge host 200 and forwarding.

- [ ] `www` certificate is valid. It has lapsed before — issued 2026-09-03,
      gone by 2026-09-20. The weekly `www certificate` workflow re-issues it;
      run it by hand from Actions if the check above fails.
- [ ] `oddfest.co` and `oddspace.co`: see the migration checklist below. Both
      still serve their own old sites. This is a known, accepted state, not a
      regression.

### 5. Email

- [ ] `hello@oddfest.co` receives from outside the organisation. Send a real
      message from a non-Google address and confirm arrival.
- [ ] The form sender `forms@oddfest.co` is still verified in Resend.
- [ ] **Do not publish `partners@`, `space@` or `fest@`.** Verified
      2026-09-21: all three bounce `550-5.1.1 does not exist`. Every contact
      topic deliberately routes to `hello@` with the topic in the subject.
- [ ] No address on `@allthingsodd.co` is published anywhere.
      `scripts/check-identity.mjs` fails the build if one appears.

### 6. Forms, end to end, against production

Submit one real message through each and confirm it arrives. Use your own
address, and write "launch check" in the body so the team can tell it from a
real enquiry.

- [ ] `/contact/` — arrives at `hello@`, subject names the topic, attribution
      footer present, automatic acknowledgement received.
- [ ] `/work-with-odd/` — email arrives **and** a person, company and deal
      appear in Attio. Submit twice from the same address: the second must not
      create a duplicate person.
- [ ] Newsletter, footer and popup — subscriber appears in beehiiv with
      `signup_page` set.
- [ ] `/oddspace/venue/` and the ODDspace membership CTAs preselect the right
      option in the enquiry form.

After each, delete the test records: Attio person/company/deal, and the
beehiiv subscriber.

### 7. Analytics and consent

- [ ] First visit with a clean profile: **no** request to any Google origin
      before a choice is made. `tests/functional/consent.spec.ts` asserts this,
      but check it once by hand in a real browser's network panel.
- [ ] Accept → GA4 loads, Realtime shows the session.
- [ ] Reject → no Google request at all.
- [ ] Withdraw via the footer's "Cookie settings" → stored value cleared,
      no further events.
- [ ] `/privacy/`'s cookie table lists exactly what the site stores. It is
      rendered from `src/scripts/consent-config.ts`, so if you added storage
      and did not add an entry, the page is now lying.
- [ ] No personally identifying value in any event. The order token is
      stripped from `page_location` and from the address bar — see
      `tests/functional/analytics-privacy.spec.ts`.

### 8. Search Console

Already done on 2026-09-21: `https://allthingsodd.co/` added, auto-verified as
site owner, sitemap submitted. Remaining, and only a human can do them:

- [ ] Inspect `/`, `/oddfest/`, `/oddference/`, `/oddspace/`,
      `/work-with-odd/` with the URL Inspection tool and request indexing.
- [ ] Confirm Google's selected canonical for each matches ours.
- [ ] Search Console lags about two days and does not backfill. Zero rows on
      day one is expected and is not a fault.

### 9. Stripe

See **Ticketing** below. Do not skip to the live key.

### 10. CRM, newsletter and data

- [ ] Attio: archive the two stray default deal statuses (`Lead`,
      `In Progress`) — Settings → Deals → stage attribute.
- [ ] Attio: 7 TEST deals and 3 TEST people from August are still present.
      Delete them before launch so the first real pipeline report is clean.
- [ ] beehiiv: create the custom fields `consent_at` and `referrer`, **both as
      string/text, not date**. The Worker branch that sends them will fail
      `/api/newsletter` if the fields do not exist. This is an ordering
      constraint, not a preference.
- [ ] Export a snapshot of Attio and beehiiv before launch, so "did we lose
      anything" has an answer.

### 11. Real devices

Emulators do not catch these. One real iPhone and one real Android:

- [ ] Mobile menu opens, traps focus, closes on Escape and on tap-outside.
- [ ] The hero video plays, or falls back to its poster without a blank frame.
- [ ] Forms submit with a soft keyboard open.
- [ ] Nothing scrolls sideways on any page.

---

## Launch

### Sequence

Order matters. The Worker first: the website's forms and ticket pages call it,
and a frontend deployed against an older backend is the failure mode this
ordering exists to prevent.

```bash
# 1. Worker — from a clean, merged main
cd odd-growth-os
git status --short                                   # must be empty
npx wrangler deploy --dry-run                        # read the output
npx wrangler d1 migrations apply odd-tickets --remote # ONLY if migrations are pending
npx wrangler deploy
```

`--remote` is load-bearing. Without it the migration is applied to the local
`wrangler dev` SQLite file and production is untouched.

```bash
# 2. Website
cd ../allthingsodd
git push origin main        # this IS the deploy
```

CI then runs checks, six functional shards, publishes to Surge, writes
`dist/build-info.json`, and verifies production is serving the deployed SHA.
It also verifies `www` redirects over a valid certificate, and warns (does not
fail) about `oddfest.co`/`oddspace.co` until they are migrated.

### Expected fingerprint

```bash
curl -s https://allthingsodd.co/build-info.json
# {"sha":"<the SHA you recorded>","builtAt":"..."}
```

If the SHA does not match, **the deploy is not live**, whatever the Actions
run says. This check exists because on 2026-08-31 every deploy silently
no-op'd for over an hour while reporting green: `SURGE_TOKEN` had gone empty
and `npx surge` sat at an interactive login prompt and exited 0.

### Smoke tests, immediately after

```bash
# Every route answers
for p in / /oddfest/ /oddference/ /oddspace/ /oddspace/venue/ /oddspace/membership/ \
         /oddspace/event-info-pack/ /oddspace/code-of-conduct/ /oddstudio/ \
         /work-with-odd/ /membership/ /oddagency/ /about/ /media/ /contact/ \
         /privacy/ /tickets/ /oddfest-2026/ ; do
  printf '%-34s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://allthingsodd.co$p)"
done

# A 404 is a real 404
curl -s -o /dev/null -w '%{http_code}\n' https://allthingsodd.co/definitely-not-a-page

# Robots and sitemap
curl -s https://allthingsodd.co/robots.txt
curl -s https://allthingsodd.co/sitemap-index.xml

# The ticket catalogue the pages read
curl -s 'https://odd-field-guide.ronny-507.workers.dev/api/tickets/catalog?event=oddference-2027'
```

Then, in a browser: submit the contact form once, accept cookies, and confirm
the session appears in GA4 Realtime.

### Who watches what, for the first two hours

| System  | Where                   | Watch for                                                                 |
| ------- | ----------------------- | ------------------------------------------------------------------------- |
| Stripe  | Dashboard → Payments    | Any attempted payment. In test mode there should be none from the public. |
| Inbox   | `hello@oddfest.co`      | Form deliveries, and bounces from `forms@oddfest.co`.                     |
| Attio   | Deals, Recently created | Enquiries arriving; no duplicate people.                                  |
| beehiiv | Audience → Subscribers  | Signups arriving with `signup_page` set.                                  |
| GA4     | Realtime                | Sessions, and `contact_submit` / `newsletter_signup` events.              |
| CI      | Actions                 | The deploy job green and the SHA verified.                                |
| Worker  | `npx wrangler tail`     | `RATE LIMIT FAILING OPEN` means the migration did not apply.              |

### Rollback

The website is a static build published to Surge. Rolling back is redeploying
the previous commit.

```bash
cd allthingsodd
git revert --no-edit <the bad commit>   # or: git reset --hard <last good SHA>
git push origin main                    # CI redeploys
```

For speed, bypassing CI — only with Ronny's say-so, and only from a clean
tree at a known-good commit:

```bash
npm ci && npm run build
printf '{"sha":"%s","builtAt":"%s"}\n' "$(git rev-parse HEAD)" \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist/build-info.json
npx surge dist https://allthingsodd.co
rm -f dist/CNAME
npx surge dist https://odd-field-guide.surge.sh
```

The Worker rolls back through its own version history:

```bash
cd odd-growth-os
npx wrangler deployments list
npx wrangler rollback --version-id <previous>
```

**A D1 migration does not roll back.** Write the down-migration before you
need it, or accept that schema changes are one-way.

---

## After launch

| When       | Check                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 30 minutes | `build-info.json` SHA still correct. Every route 200. One form submitted and received. GA4 Realtime non-zero. No Stripe activity.                                                                                                                                                                                                                                        |
| 2 hours    | Inbox: deliveries arriving, no bounces. Attio: no duplicates. beehiiv: signups present. `wrangler tail`: no repeated errors.                                                                                                                                                                                                                                             |
| End of day | GA4: sessions, `contact_submit`, `newsletter_signup`, `cta_click`. Count form submissions against inbox arrivals — the two numbers must agree. Any failed form is a lost enquiry; investigate each.                                                                                                                                                                      |
| 24 hours   | `node scripts/measure-cwv.mjs --base https://allthingsodd.co` — every route inside budget on the real host. Search Console: Coverage has begun. Re-check the `www` certificate.                                                                                                                                                                                          |
| 72 hours   | Search Console: core URLs indexed, Google-selected canonical matches ours, no "Excluded by noindex" on a page that should be indexed, no duplicate-content warning naming `oddfest.co`/`oddspace.co`/`odd-field-guide.surge.sh`.                                                                                                                                         |
| 1 week     | Conversion review: sessions → `contact_submit`/`business_enquiry_submit`/`newsletter_signup`. Attribution review: how many enquiries carry a real `utm_source`, and how many say "direct" because a posted link was never tagged. Error review: every `*_error` event and every `wrangler tail` error. Ticket inventory: reservations held against orders actually paid. |

### The failure that is silent

Growth OS's scheduled refresh reports its own success into a log nobody
reads, and a failure is silent. It aborted every run for three weeks in
September 2026 while serving stale data. After launch, check
`data/refresh.log` — or make it tell someone.

---

## Ticketing: the live-mode cutover

**Current state: card payment is not open, deliberately.**

`STRIPE_PUBLISHABLE_KEY` in `src/scripts/tickets/config.ts` is a `pk_test_`
key. `salesEnabled()` therefore closes the sale on the public hosts, and
`/tickets` publishes the real prices with an invoice route instead of a
checkout. Nothing needs to be flipped to keep it that way.

Why it matters: before 2026-09-21, production offered a purchasable €299
ticket while the checkout ran on that test key. Eleven orders and €6,036 were
attempted between 1 and 17 September. **Nothing was paid and no ticket was
issued.**

### Verify test mode first

- [ ] `/tickets/?sales=closed` shows the closed state with prices, an invoice
      route and a way to ask a question. (This is also what production shows.)
- [ ] On localhost, a full test-mode purchase completes end to end: cart →
      buyer details → Stripe embedded payment with card `4242 4242 4242 4242`
      → webhook → order `paid` → tickets issued with QR codes → attendee
      assignment → confirmation email.
- [ ] €299 / €399 / €499 ex VAT, VAT at 13.5%, rounding per line. Blind Bird
      × 1 = €339.37. The summary and Stripe must agree to the cent.
- [ ] Inventory decrements. Maximum quantity per order is enforced.
- [ ] An expired order, an abandoned checkout, a duplicate webhook delivery,
      an invalid signature and a Stripe API failure each behave as documented.

### Then, and only then

1. [ ] Set `pk_live_…` in `src/scripts/tickets/config.ts`. Sales open by
       themselves — there is no second switch.
2. [ ] `npx wrangler secret put STRIPE_SECRET_KEY` with the matching **live**
       key. Mismatched modes fail at the Stripe API, not silently.
3. [ ] Create the live webhook endpoint in Stripe, pointing at
       `https://odd-field-guide.ronny-507.workers.dev/api/tickets/webhook`,
       subscribed to `checkout.session.completed`.
4. [ ] `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with the live signing
       secret. A test-mode secret against live traffic means every payment is
       taken and no ticket is ever issued.
5. [ ] Confirm `TICKET_SIGNING_SECRET` and `CHECKIN_API_KEY` are set.
6. [ ] Confirm the D1 database and its migrations are the production ones.
7. [ ] Confirm live product and tax configuration in Stripe.
8. [ ] `npx wrangler deploy`.
9. [ ] **One real purchase, with a real card, by a human.** Then refund it
       from the Stripe dashboard. This is the only step that proves the live
       path; nothing before it does.
10. [ ] Confirm that purchase produced: a Stripe payment, a `paid` order, an
        issued ticket with a QR code, a confirmation email, and a `purchase`
        event in GA4 with the right revenue.
11. [ ] Write down the refund procedure, or test it on that purchase.
12. [ ] Watch the Stripe dashboard and `wrangler tail` for the first hour of
        real sales.

Do not simulate step 9.

---

## Domain and email migration

`oddfest.co` and `oddspace.co` still serve their own standalone pre-All-Things-ODD
sites. They are meant to be controlled entry points into `allthingsodd.co`.
Neither can be changed from these repositories.

**Verified 2026-09-21, and this is the part that can go badly wrong:**

| Domain            | DNS                                   | Serves                     | Mail                                                                            |
| ----------------- | ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `allthingsodd.co` | Surge (`ns1-4.surge.world`)           | the current site           | **no MX at all**                                                                |
| `oddfest.co`      | GoDaddy (`ns51/52.domaincontrol.com`) | Vercel (`76.76.21.21`)     | **Google Workspace — 5 MX records, SPF, DKIM for `google` and `resend`, DMARC** |
| `oddspace.co`     | Hostinger (`ns1/2.dns-parking.com`)   | LiteSpeed (`45.84.206.17`) | no MX                                                                           |

`oddfest.co` carries ODD's entire email system _and_ the verified Resend
sending domain the website's forms use. Touching its MX, SPF, DKIM or DMARC
records breaks every form on the site and every mailbox in the organisation.

### oddfest.co → /oddfest

Keep the domain on GoDaddy DNS and on Vercel. Do not move nameservers.

1. In Vercel, open the project serving `oddfest.co`.
2. Add a redirect to `https://allthingsodd.co/oddfest` for the root, and
   decide whether deeper paths go to the same place or map individually.
   Prefer `308` so the method and body survive; `301` is acceptable.
3. Apply it to `www.oddfest.co` too — it currently 308s to the apex, so the
   apex rule will cover it once the apex redirects.
4. **Change no DNS record.** A redirect configured in Vercel needs no DNS
   change at all, which is exactly why this is the safe route.

**Never touch:** the five `aspmx.l.google.com` MX records, the SPF TXT
(`v=spf1 include:_spf.google.com include:amazonses.com ~all`),
`google._domainkey`, `resend._domainkey`, `_dmarc`, or either
`google-site-verification` TXT record.

After: `curl -sSI https://oddfest.co/` must show a 3xx whose `Location` is on
`allthingsodd.co`, and `dig +short MX oddfest.co` must still list all five
Google servers. Send a test email to `hello@oddfest.co` and confirm arrival.
Submit the website's contact form and confirm it still sends — that proves the
Resend domain survived.

### oddspace.co → /oddspace

Hostinger, WordPress, no mail. Lower risk.

1. Either add a redirect in Hostinger's control panel, or replace the site
   with a one-line static redirect to `https://allthingsodd.co/oddspace`.
2. Keep `www.oddspace.co` folding onto the apex, or point it at the same
   redirect.
3. No mail records exist, so there is nothing to protect — but check
   `dig MX oddspace.co` once before and once after anyway.

### Once migrated, CI enforces it

`.github/workflows/ci.yml`'s "Verify the other ODD domains redirect here" job
adapts on its own. A domain that has not been migrated **warns**. One that has
been is then held to it forever, so a redirect that later breaks or points
somewhere wrong **fails the deploy**. There is no switch to remember.

### Email addresses: prepared, not published

The intended structure is group addresses that route by topic rather than by
person, so a team change never needs a deploy. The website already sends a
distinct `topic` with every contact message and names it in the subject.

What is missing is the groups themselves. Until each one has been verified to
receive from outside the organisation, **every topic must keep routing to
`hello@`** — a bounce loses the message outright, which is worse than a shared
inbox.

For each of `partners@`, `space@`, `fest@`, plus media and ticket support:

1. Google Workspace admin → Groups → create the group on `oddfest.co`.
2. Add members. Allow external senders — this is the step that is easy to miss
   and it is the one that makes the address usable by the public.
3. Send a real message from an address outside the organisation. Confirm it
   arrives for every member.
4. Only then change that topic's line in `CONTACT_RECIPIENTS` in
   `../odd-growth-os/worker/src/index.ts`, and redeploy the Worker.

Moving the published address to `@allthingsodd.co` is a separate decision and
a larger one: that domain has no MX records, and Surge's DNS cannot serve the
CNAME and MX records Google Workspace and Resend need. Hosting mail there
means moving the domain's DNS off Surge first. `scripts/check-identity.mjs`
fails the build if an `@allthingsodd.co` address is published before that
happens, deliberately.
