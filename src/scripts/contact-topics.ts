// The contact form's routing table — shared by ContactForm.astro (which
// renders the <select>) and, by hand, the Growth OS Worker's validate.ts +
// index.ts (which accept the same `topic` values and pick the recipient).
//
// Who receives each topic is NOT here, on purpose: the Worker picks the
// recipient, so a routing change never needs a website deploy.
//
// Every topic currently reaches hello@oddfest.co. The design routes each to
// its own Google Group (partners@ / space@ / fest@), but those three do not
// exist: a real test message to each came back "the email account that you
// tried to reach does not exist" (2026-09-21). This comment used to assert
// they existed, which is how the gap stayed invisible for months — so say
// what is true, and check before claiming an address works.
//
// The topics stay separate regardless: the subject line names the topic, and
// that is what lets a shared inbox tell a sponsor enquiry from a festival
// submission and forward it to the right person.

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
