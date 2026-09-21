// The contact form's routing table — shared by ContactForm.astro (which
// renders the <select>) and, by hand, the Growth OS Worker's validate.ts +
// index.ts (which accept the same `topic` values and pick the recipient).
//
// Who receives each topic is NOT here, on purpose: the Worker delivers to
// Google Groups on oddfest.co (hello@ / partners@ / space@ / fest@) whose
// membership lives in Workspace admin, so a team change never needs a deploy.
//
// `partnering` and `oddfest` reach the same three people today. They are still
// two topics: they will not always, and the subject line is what lets the
// shared inbox tell a sponsor enquiry from a festival submission.

export interface ContactTopic {
  /** Submitted as `topic`; the Worker routes by it. */
  value: 'general' | 'partnering' | 'oddspace' | 'oddfest';
  /** The visible option text. */
  label: string;
}

export const CONTACT_TOPICS: readonly ContactTopic[] = [
  {
    value: 'general',
    label: 'Something else / not sure',
  },
  {
    value: 'partnering',
    label: 'Partnerships & ODDference',
  },
  { value: 'oddspace', label: 'ODDspace' },
  { value: 'oddfest', label: 'ODDfest' },
];

export type ContactTopicValue = ContactTopic['value'];
