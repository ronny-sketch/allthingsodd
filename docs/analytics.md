# Analytics

What this site measures, what each event is for, and the traps that have
already cost real data. Written 2026-09-21, after an audit found the GA4
setup collecting steadily and reporting almost nothing usable.

## The property

|                |                                                                 |
| -------------- | --------------------------------------------------------------- |
| Measurement ID | `G-FCGTBXT9KS`                                                  |
| Property       | `555204778` ("All things ODD")                                  |
| Stream         | "All things ODD" (`15816308905`), URL `https://allthingsodd.co` |

The ID lives in exactly one place, `src/scripts/analytics-config.ts`. It is
host-independent, which is why the 2026-09-03 move from
`odd-field-guide.surge.sh` to `allthingsodd.co` needed no code change.

### The other two properties, and why

This site reported to the pre-launch property `551982005` (stream
`G-9Q90CQMBK8`) from 2026-08-28 until the 2026-09-21 launch. That property
is **not deleted**. GA4 properties cannot be merged and a measurement-ID
change starts history at zero, so it is the only place those ~2,000
sessions exist. Growth OS reads both property IDs, so allthingsodd.co's
numbers stay continuous across the cutover instead of dropping to zero on
launch day. `GA4_PROPERTY_ID` in that repo is a comma-separated list.

Property `527983299` (`G-40BNRGTY1T`) is **oddfest.co**, a genuinely
separate live site with its own Google Tag Manager container and Cookiebot.
It is out of scope here and deliberately out of Growth OS: folding it in
would merge two different sites into one session count.

**Nothing loads before consent.** `gtag.js` is not requested at all until a
visitor accepts the `statistics` category. This is stricter than Consent
Mode, which still pings Google from a page the visitor never agreed to, and
it is deliberate: ODD is a Finnish association and GA4's cookies are not
"strictly necessary". See `analytics.ts` for the full reasoning.

A consequence worth knowing when reading any number below: **GA4 sees only
consenting visitors.** Session counts are a floor, not a total.

## Events

Everything goes through `trackEvent()` in `src/scripts/analytics.ts`. It is
a no-op without consent, so callers never check.

### Ticket funnel

These use GA4's **recommended** names, not names of our own. That is the
entire reason the funnel works. GA4's Ecommerce reports — revenue, items,
purchase journey, monetisation — key off these exact names and off the
`items` / `value` / `currency` parameter shape. Until 2026-09-21 this site
sent `ticket_page_viewed`, `checkout_started`, `payment_succeeded` and
similar. GA4 accepted all of them and built nothing from any of them.

| Event              | Fired when                         | Carries                                 |
| ------------------ | ---------------------------------- | --------------------------------------- |
| `view_item_list`   | The catalog resolves on `/tickets` | Active ticket types                     |
| `add_to_cart`      | A stepper goes up                  | The change, `value`, `items`            |
| `remove_from_cart` | A stepper goes down                | The change, `value`, `items`            |
| `begin_checkout`   | Leaving for `/tickets/checkout`    | Cart total, `items`                     |
| `add_payment_info` | Stripe's form mounts               | Order total, `items`                    |
| `purchase`         | The webhook confirms payment       | `transaction_id`, `value`, `items`      |
| `ticket_assigned`  | An attendee name is saved          | `event_slug`. Custom, no GA4 equivalent |

`purchase`'s `items` carry the catalogue **slug** as `item_id`, plus `price`,
exactly as the four steps above them do. Until 2026-09-21 it sent the raw
ticket-type uuid and no price, so GA4 — which joins item-level funnels on
`item_id` — could not follow a single ticket from a list view through to a
sale, and every item-level revenue column was empty while the event-level
`value` looked correct. Both sides now come from `itemFor()`, so there is one
shape rather than two.

The mapping lives in `src/scripts/tickets/ecommerce.ts`.

### Forms

| Event                     | Fired when                                    | Carries                                            |
| ------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `newsletter_signup`       | beehiiv accepts a signup                      | `signup_source`                                    |
| `newsletter_error`        | beehiiv refuses, or the request throws        | `signup_source`, `error_kind`                      |
| `contact_submit`          | `/api/contact` accepts a message              | `contact_topic`                                    |
| `contact_error`           | `/api/contact` refuses, or the request throws | `contact_topic`, `error_kind`                      |
| `business_enquiry_submit` | A Work with ODD enquiry reaches Attio         | `product_interest`                                 |
| `business_enquiry_error`  | The enquiry is refused, or the request throws | `product_interest`, `error_kind`                   |
| `booking_enquiry_open`    | The enquiry dialog is first opened on a page  | `entry` (hero/sticky/final/rate-card/link/history) |
| `booking_enquiry_submit`  | `/api/booking-enquiry` accepts an enquiry     | `space`, `event_type`, `queued`                    |
| `booking_enquiry_error`   | The enquiry is refused, or the request throws | `space`, `event_type`, `error_kind`                |
| `cta_click`               | A `mailto:` or an `?interest=` deep link      | `cta_id`, `cta_intent`, `cta_location`             |

`error_kind` is `network` when the fetch threw and `rejected` when the
backend answered with `ok: false`. The booking form (2026-09-23) adds `invalid` (the
Worker's 400 with field errors) and `rate_limited` (429), and `queued: true`
on a submit means the Worker answered 202: Notion was unreachable and the
enquiry is waiting in its retry queue. The distinction is the whole point: one is
the visitor's connection, the other is ours, and before 2026-09-21 neither
was reported at all — a broken Worker and a quiet week produced identical
numbers.

`cta_click` is one event rather than the four the launch brief asked for
(`partner_cta_click`, `oddspace_membership_click`,
`oddspace_venue_enquiry_click`, `email_click`). They are the same question,
and `cta_id` answers it: the product enum from the `?interest=` deep link, or
`email` for a `mailto:`. One delegated listener in `analytics.ts` covers every
CTA on the site and keeps covering the next one without a code change.
`external_social_click` is deliberately absent — GA4's enhanced measurement
already reports outbound http(s) clicks with `link_domain`/`link_url`, and a
second event would double-count them. `cta_location` is the pathname only,
never the full URL.

Both are custom names, kept as-is because Growth OS already reads them.

## Four traps, all of which have already bitten

**1. Never send `source`, `medium` or `campaign` as event parameters.**
GA4 reads them as traffic-source attribution and rewrites the session,
and every later event in that session inherits it. The newsletter form
sent `source: 'footer_newsletter'` and on 2026-09-20, 22 of 24
ticket-funnel events in the property were attributed to a "source" called
`footer_newsletter`. `trackEvent()` now drops these keys and warns.

**2. Monetary values are major units.** Everything else in the ticket
stack is minor units. Mixing them reports €45 as €4,500. Use `toMajor()`.

**3. `add_to_cart` carries the change, not the new total.** A stepper
going 2 → 1 is one removal. Sending the absolute quantity counts a cart
several times over.

**4. `purchase` must be de-duplicated.** GA4 does not reliably do it on
`transaction_id`. A visitor reloading the confirmation page would double
the revenue, so `firstReportOf()` guards it.

## What must never be sent

| Never                                       | Why                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A name, an email address, a phone number    | Against GA4's own terms, and against `/privacy`                                                                      |
| The body of a contact message or an enquiry | Free text is unbounded; treat every field a visitor types as PII                                                     |
| `order_token`                               | A bearer capability, not an identifier: it authorises reading an order's buyer details and reassigning its attendees |
| A full ticket code                          | The QR credential                                                                                                    |
| A Stripe session id, or any payment detail  |                                                                                                                      |
| An Attio record id                          |                                                                                                                      |

The order token is the one that actually happened. Stripe returns a buyer to
`/tickets/confirmation/?session_id=…&order_token=…`; GA4's automatic
`page_view` sends the full URL as `page_location` and the next navigation
sends it again as `page_referrer`. Every ticket **event** was written
carefully to keep the token out — `ecommerce.ts` hashes it rather than
passing it through — and that care is exactly what made the page view easy to
miss: the events were clean and the page view was not, on every purchase.

Two independent fixes, both shipped 2026-09-21 and both tested in
`tests/functional/analytics-privacy.spec.ts`:

1. `analytics.ts` passes `page_location` and `page_referrer` explicitly, with
   `SECRET_QUERY_PARAMS` stripped. One place, every page, and the next secret
   query parameter is covered before anyone adds it. UTM parameters survive —
   stripping the whole query string would destroy every campaign report.
2. `tickets/confirmation.ts` removes the token from the address bar with
   `history.replaceState` once it has been persisted, which also keeps it out
   of browser history and out of the Referer header of anything linked from
   that page. It only scrubs if the write succeeded: a buyer opening the link
   in a fresh tab has the token nowhere else, and losing their order to
   protect their token would be the worse bug.

## Attribution, and why almost everything says "direct"

As of 2026-09-21, about 1,892 of 1,982 sessions are `(direct)/(none)` and
there are **zero** social referrals — despite ODD posting steadily. Not one
of 11 ticket orders carries a `utm_source`, although first-touch capture
(`src/scripts/utm.ts`) works and has stored the column all along.

The cause is untagged links. In-app browsers on Instagram, LinkedIn and
TikTok strip referrers, so an untagged link from a post is indistinguishable
from someone typing the URL. No amount of analytics configuration fixes
this, and connecting a social platform's own API would not either: it would
report what happened _on_ the platform, never which visit or ticket it led
to.

The fix is a convention, applied by whoever posts the link:

```
https://allthingsodd.co/tickets/?utm_source=instagram&utm_medium=social&utm_campaign=oddference-2027
```

- `utm_source` — the platform: `instagram`, `linkedin`, `tiktok`, `newsletter`
- `utm_medium` — `social`, `email`, `paid`, `partner`
- `utm_campaign` — what is being sold: `oddference-2027`, `oddspace`

Lowercase, no spaces. The values become the labels in every report, so
inconsistency costs more than absence.

Both GA4 and the ticket database pick these up automatically. The order
attribution view (`v_intel_ticket_attribution` in Growth OS) is what turns
them into "this channel sold this many tickets".

## Test safety

No test may write into the live property, and two have. `tests/base.ts`
exports a `test` with an auto-use fixture that aborts every Google origin;
import `test` from there rather than from `@playwright/test` in any spec that
can reach a consent decision. Aborting the **loader** is the right level:
`/g/collect` only ever comes from `gtag.js`, so nothing can be sent, while an
aborted request still fires `page.on('request')` — which is what lets
`consent.spec.ts` keep asserting that no Google request was even attempted
before consent.

The two incidents, both on 2026-09-21: `consent.spec.ts` submitted the
newsletter form with consent granted and put 18 real `newsletter_signup`
events into the key-event count; and `mobile/interaction.spec.ts` tapped
"Accept all" with no block at all, on two projects, inflating users and
sessions on every full run. Both were fixed per file by remembering.
Playwright has no global `route` setting, so the fixture is the only way to
make it structural.

## Verifying a change

Functional tests live in `tests/functional/consent.spec.ts` and cover: no
request before consent, the `dataLayer` command shape, and that a signup
cannot rewrite its own traffic source. They need a running preview:

```bash
npm run build && npx astro preview --port 4399
PLAYWRIGHT_BASE_URL=http://localhost:4399 npx playwright test tests/functional/consent.spec.ts --project=functional-chromium
```

For live checks, GA4's DebugView is the only reliable view of parameters.
Realtime shows event names but silently hides malformed `items` arrays.

## Configured, for the record

All done 2026-09-21, none of it visible from the code:

|                         |                                                            |
| ----------------------- | ---------------------------------------------------------- |
| Search Console property | `https://allthingsodd.co/`, auto-verified as site owner    |
| Sitemap                 | `sitemap-index.xml` submitted                              |
| Key events              | `purchase`, `business_enquiry_submit`, `newsletter_signup` |
| Event-data retention    | 14 months, raised from GA4's 2-month default               |

The Search Console property auto-verified with no new file, because
`google181860bcd4b9963d.html` in `public/` was already serving on the
domain. It reads zero for about two days: Search Console lags, and it does
not backfill, which is why the three-week gap after the domain cutover cost
data that cannot be recovered.

Retention matters more than it looks. Two months is the default and it
silently caps every Exploration and every event-level analysis, while
standard reports carry on looking fine because they are pre-aggregated.
Nobody notices until they try to compare against last season.

## Still outstanding

**The UTM convention above is the only one that changes what you can
learn**, and it is a habit rather than a setting. Until posted links carry
tags, social stays invisible no matter what is connected.

Two smaller ones:

1. **An OAuth token is in this project's sibling repo's git history and has
   not been rotated.** See `../odd-growth-os/ops/RUNBOOK.md`, "Leaked OAuth
   token". It does not affect this site, but it covers the credentials that
   read GA4 and Search Console.
2. **`NOTION_API_KEY` is unset** in Growth OS, so the revenue tracker runs
   on an old snapshot.
