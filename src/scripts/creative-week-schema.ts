// The ODDfest 2027 Creative Week submission: its questions' values, labels
// and rules in one place (2026-10-04). The dialog (CreativeWeekForm.astro)
// renders its options from here and the submit script
// (creative-week-form.ts) validates against it, so the two cannot drift.
//
// Source of truth for the questions: the ODDfest team's Google Form
// "ODDfest 2027 form" ("Bring your event to ODDfest 2027!"). Every question
// is here, none added except the privacy tick box the site's other forms
// have; the labels are the form's own wording, in British spelling and the
// site's sentence case. The Worker route that receives this
// (../odd-growth-os, POST /api/creative-week-submission) re-validates
// everything with its own copy of these values and messages
// (worker/src/creative-week/schema.ts), because this site never imports
// Growth OS code (AGENTS.md, "Growth OS integration"). Change a value here,
// change it there in the same pull request. The Notion option each value
// lands on is mapped in the Worker, not here.
//
// Four answers the Google Form marks required are optional or conditional
// here, as in the Worker, because the form's own wording contradicts the
// flag: the venue ("…if known") is asked only when one is agreed or in
// mind, space needs ("If the location is still open…") only then, and the
// timing notes ("Leave blank if flexible") and "Anything else?" are
// optional.

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

const opts = <V extends string>(pairs: [V, string][]): Option<V>[] =>
  pairs.map(([value, label]) => ({ value, label }));

export const APPLICANT_TYPES = opts([
  ['artist', 'Artist / creative professional'],
  ['collective', 'Collective / community'],
  ['association', 'Cultural association / non-profit'],
  ['creative_business', 'Creative business / studio'],
  ['institution', 'Cultural institution'],
  ['venue', 'Venue'],
  ['outside_fields', 'Organisation outside the creative or cultural fields'],
  ['other', 'Other'],
]);

export const EVENT_KINDS = opts([
  [
    'professional_exchange',
    'Professional exchange — learning, sharing ideas or making connections',
  ],
  ['art_experience', 'Art & experiences — encountering, enjoying or taking part in creative work'],
  ['mix', 'A mix of both'],
]);

export const FORMATS = opts([
  ['exhibition', 'Exhibition / installation'],
  ['performance', 'Performance'],
  ['concert', 'Concert / live music'],
  ['nightlife', 'Nightlife / club / counterspace'],
  ['screening', 'Screening'],
  ['talk', 'Talk / discussion'],
  ['workshop', 'Workshop'],
  ['open_studio', 'Open studio / open house'],
  ['networking', 'Professional / networking event'],
  ['tour', 'Tour / walk'],
  ['launch', 'Launch'],
  ['market', 'Market'],
  ['participatory', 'Participatory experience'],
  ['food', 'Food / shared meal / gathering'],
  ['other', 'Other'],
]);

export const FIELDS = opts([
  ['visual_arts', 'Visual arts'],
  ['design', 'Design'],
  ['architecture', 'Architecture'],
  ['music', 'Music & sound'],
  ['film', 'Film & audiovisual'],
  ['performing_arts', 'Performing arts'],
  ['fashion', 'Fashion'],
  ['games', 'Games'],
  ['literature', 'Literature / publishing'],
  ['creative_tech', 'Creative technology'],
  ['creative_business', 'Creative business'],
  ['other', 'Other'],
]);

export const READINESS = opts([
  ['ready', 'The event is basically ready — we mainly want to join ODDfest'],
  [
    'team_in_place',
    'The concept and organising team are in place — some practical details are open',
  ],
  ['building_team', 'The concept is clear — we are still putting the team together'],
  ['early_idea', 'It is an early idea — we are exploring how to make it happen'],
  ['other', 'Other'],
]);

export const VENUE_STATUS = opts([
  ['agreed', 'Yes — agreed with the venue or location owner'],
  ['in_discussion', 'We have one in mind / discussions are ongoing'],
  ['needs_venue', 'No — we would welcome introductions to possible venues'],
  [
    'outdoor_open',
    'The event is outdoors, mobile or site-specific, and the location is still open',
  ],
  ['not_relevant', 'A physical venue is not relevant for the event'],
]);
/** A venue is named for these, and space needs are asked for those. */
export const VENUE_NAMED = ['agreed', 'in_discussion'];
export const VENUE_OPEN = ['needs_venue', 'outdoor_open'];

export const TIMING = opts([
  ['one_day', 'One specific day / limited availability'],
  ['several_days', 'Several possible days'],
  ['whole_week', 'Runs throughout the week'],
  ['flexible', 'Flexible / not decided yet'],
]);

export const AUDIENCES = opts([
  ['general_public', 'General public'],
  ['creative_professionals', 'Creative professionals'],
  ['creative_community', 'A specific creative community'],
  ['business', 'Business / professional audience'],
  ['students', 'Students / emerging creatives'],
  ['families', 'Families / kids'],
  ['invitation_only', 'Invitation-only audience'],
  ['other', 'Other'],
]);

export const ACCESS = opts([
  ['free_open', 'Free, no registration'],
  ['free_registration', 'Free with registration'],
  ['ticketed', 'Ticketed'],
  ['invitation', 'Invitation only'],
  ['mix', 'A mix — depending on the activity'],
  ['undecided', 'Not decided yet'],
]);

export const HELP = opts([
  ['visibility', 'Visibility through the shared ODDfest programme and campaign'],
  ['venue', 'Help finding a venue'],
  ['collaborators', 'Finding collaborators / other creatives'],
  ['organisations', 'Connections to organisations or companies'],
  ['commercial_partners', 'Connections to potential commercial partners'],
  ['technical', 'Technical / resource connections'],
  ['nothing', 'Nothing beyond being part of the programme'],
  ['other', 'Other'],
]);

export const FINANCING = opts([
  ['own', 'We can produce it with our own or already secured resources'],
  ['partly', 'Financing or resourcing is partly secured'],
  ['seeking', 'We are looking for partners or funding, but nothing is secured yet'],
  ['open', 'Financing is still completely open'],
  ['not_sure', 'Not sure yet'],
]);

export const REFERRAL = opts([
  ['friend', 'Friend / another artist'],
  ['community', 'ODD community'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['newsletter', 'Newsletter'],
  ['previous', 'Previous ODDfest / Creative Week'],
  ['partner', 'Partner organisation'],
  ['other', 'Other'],
]);

/** Same limits as the Worker: one-line answers, a line of text, and a long answer. */
export const LIMITS = { short: 200, line: 500, long: 4000, phone: 30 } as const;

export interface CreativeWeekPayload {
  submission_id: string;
  source?: string;
  hp_field: string;

  full_name: string;
  email: string;
  phone: string;
  org_name: string;
  website: string;
  applicant_type: string;
  applicant_type_other?: string;

  title: string;
  description: string;
  event_kind: string;
  formats: string[];
  formats_other?: string;
  fields: string[];
  fields_other?: string;
  motivation?: string;

  readiness: string;
  readiness_other?: string;
  involved?: string;
  still_needed: string;

  venue_status: string;
  venue?: string;
  space_needs?: string;
  timing_flexibility: string;
  timing_notes?: string;

  audiences: string[];
  audiences_other?: string;
  access: string;
  capacity: string;

  help: string[];
  help_other?: string;
  help_details: string;
  financing: string;

  links?: string;
  notes?: string;
  referral?: string;
  referral_other?: string;

  ack_selection: boolean;
  ack_responsibility: boolean;
  consent_privacy: boolean;
}

export type FieldErrors = Partial<Record<keyof CreativeWeekPayload, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s-]{5,30}$/;
const has = (list: Option[], v: unknown) => list.some((o) => o.value === v);

/** The Worker's rules and messages (worker/src/creative-week/schema.ts), for a payload built by the form. */
export function validateCreativeWeek(p: CreativeWeekPayload): FieldErrors {
  const e: FieldErrors = {};
  const text = (k: keyof CreativeWeekPayload, max: number, msg?: string) => {
    const v = p[k];
    const s = typeof v === 'string' ? v.trim() : '';
    if (s === '') {
      if (msg) e[k] = msg;
    } else if (s.length > max) e[k] = `Keep this under ${max} characters.`;
  };
  const one = (k: keyof CreativeWeekPayload, list: Option[], msg: string) => {
    if (!has(list, p[k])) e[k] = msg;
  };
  const many = (k: keyof CreativeWeekPayload, list: Option[], msg: string) => {
    const v = p[k];
    if (!Array.isArray(v) || v.length === 0) e[k] = msg;
    else if (!v.every((x) => has(list, x))) e[k] = 'Unknown option.';
  };
  const other = (k: keyof CreativeWeekPayload, picked: boolean) => {
    if (picked) text(k, LIMITS.line, 'Tell us what you mean by other.');
  };

  text('full_name', LIMITS.short, 'Tell us your name.');
  text('email', LIMITS.short, 'We need an email address to reply to.');
  if (!e.email && !EMAIL_RE.test(p.email.trim().toLowerCase()))
    e.email = 'That email address does not look right.';
  text('phone', LIMITS.phone, 'Add a phone number we can reach you on.');
  if (!e.phone && !PHONE_RE.test(p.phone.trim()))
    e.phone = 'Use digits, spaces and an optional + only.';
  text(
    'org_name',
    LIMITS.short,
    'Name your organisation, collective or project. Your own name works too.',
  );
  text('website', LIMITS.line, 'Add a website, Instagram handle or portfolio link.');
  one('applicant_type', APPLICANT_TYPES, 'Pick the one that describes you best.');
  other('applicant_type_other', p.applicant_type === 'other');

  text('title', LIMITS.short, 'Give the idea a working title. A rough one is fine.');
  text('description', LIMITS.long, 'Describe what actually happens.');
  one('event_kind', EVENT_KINDS, 'Pick the closest type.');
  many('formats', FORMATS, 'Pick at least one format.');
  other('formats_other', p.formats.includes('other'));
  many('fields', FIELDS, 'Pick at least one creative field.');
  other('fields_other', p.fields.includes('other'));
  text('motivation', LIMITS.long);

  one('readiness', READINESS, 'Tell us where the idea is right now.');
  other('readiness_other', p.readiness === 'other');
  text('involved', LIMITS.line);
  text('still_needed', LIMITS.line, 'Tell us what is still needed.');

  one('venue_status', VENUE_STATUS, 'Tell us where things stand with a venue.');
  if (VENUE_NAMED.includes(p.venue_status))
    text('venue', LIMITS.line, 'Name the place, or the route.');
  if (VENUE_OPEN.includes(p.venue_status))
    text('space_needs', LIMITS.long, 'Tell us what kind of space you need.');
  one('timing_flexibility', TIMING, 'Tell us how flexible your timing is.');
  text('timing_notes', LIMITS.line);

  many('audiences', AUDIENCES, 'Pick at least one audience.');
  other('audiences_other', p.audiences.includes('other'));
  one('access', ACCESS, 'Tell us how people would get in.');
  text('capacity', LIMITS.line, 'A rough estimate is enough.');

  many('help', HELP, 'Pick at least one, or nothing beyond the programme.');
  other('help_other', p.help.includes('other'));
  text('help_details', LIMITS.long, 'Tell us a little more about what you need.');
  one('financing', FINANCING, 'Tell us how the event will be resourced.');

  text('links', LIMITS.long);
  text('notes', LIMITS.long);
  if (p.referral) one('referral', REFERRAL, 'Unknown option.');
  other('referral_other', p.referral === 'other');

  if (p.ack_selection !== true) e.ack_selection = 'Tick this to send your idea.';
  if (p.ack_responsibility !== true) e.ack_responsibility = 'Tick this to send your idea.';
  if (p.consent_privacy !== true)
    e.consent_privacy = 'We can only store your idea if you agree to this.';
  return e;
}

// The Worker's answer is read by the shared strict reader, which the quote
// form uses too. Re-exported so this module stays the form's one import.
export { readOutcome, type Outcome } from './submission-outcome';
