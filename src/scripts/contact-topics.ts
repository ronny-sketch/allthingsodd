// The contact form's routing table — shared by ContactForm.astro (which
// renders the <select>) and contact-form.ts (which picks the Web3Forms key
// at submit time), so the option list and the key lookup can never drift
// apart.
//
// What is NOT here, on purpose: who actually receives each topic. Each key
// in `formAccessKeys` is registered to a Google Group on oddfest.co, and the
// membership of those groups lives in Workspace admin. Putting aki@/upi@/
// georgii@/fernando@ in this file would mean a code change and a deploy every
// time someone joins or leaves a team — and this site's deploy needs a manual
// `npx surge dist` (docs/deployment.md), so that routing table would drift out
// of date without anybody noticing that messages were still going to someone
// who left.
//
//   general     → hello@oddfest.co
//   partnering  → partners@oddfest.co   (currently Aki, Upi, Ronny + hello@)
//   oddspace    → space@oddfest.co      (currently Ronny, Georgii, Fernando + hello@)
//   oddfest     → fest@oddfest.co       (currently Aki, Upi, Ronny + hello@)
//
// hello@allthingsodd.co is a Workspace domain alias of hello@oddfest.co — the
// same mailbox, not a second one — so it is not addressed separately. If that
// ever becomes a genuinely separate mailbox, add it to the groups rather than
// adding a second recipient here.
//
// `partnering` and `oddfest` reach the same three people today. They are still
// two topics: they will not always, and the subject line is what lets the
// shared inbox tell a sponsor enquiry from a festival submission.

export interface ContactTopic {
  /** Submitted as `topic`, and the lookup key into `formAccessKeys`. */
  value: 'general' | 'partnering' | 'oddspace' | 'oddfest';
  /** The visible option text. */
  label: string;
  /** How this topic names itself in the email subject line. */
  subject: string;
}

export const CONTACT_TOPICS: readonly ContactTopic[] = [
  {
    value: 'general',
    label: 'Something else / not sure',
    subject: 'General',
  },
  {
    value: 'partnering',
    label: 'Partnerships & ODDference',
    subject: 'Partnering / ODDference',
  },
  { value: 'oddspace', label: 'ODDspace', subject: 'ODDspace' },
  { value: 'oddfest', label: 'ODDfest', subject: 'ODDfest' },
];

export type ContactTopicValue = ContactTopic['value'];

export type ContactAccessKeys = Partial<Record<ContactTopicValue, string>>;
