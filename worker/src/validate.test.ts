// Pure-function tests for the server-side validation gate — the part of the
// Worker that actually protects Attio/beehiiv from bad input, independent of
// whether either account exists yet. See ops/GROWTH_OS_GUIDE.md §40 (form
// integration tests) and §28 (never trust frontend validation alone).
import { describe, expect, it } from 'vitest';
import { validateEnquiry, validateSubscribe, ValidationError } from './validate';

const validEnquiry = {
  name: 'Jane Doe',
  work_email: 'jane@examplecorp.com',
  organisation: 'Example Corp',
  interest: 'oddagency',
  goal: 'Explore a creative brief',
};

describe('validateEnquiry', () => {
  it('accepts a fully valid submission and normalises email + submitted_at', () => {
    const result = validateEnquiry(validEnquiry);
    expect(result.work_email).toBe('jane@examplecorp.com');
    expect(result.name).toBe('Jane Doe');
    expect(result.submitted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('lowercases the email', () => {
    const result = validateEnquiry({ ...validEnquiry, work_email: 'Jane@ExampleCorp.com' });
    expect(result.work_email).toBe('jane@examplecorp.com');
  });

  it('rejects a missing required field', () => {
    const { name, ...rest } = validEnquiry;
    expect(() => validateEnquiry(rest as never)).toThrow(ValidationError);
  });

  it('rejects an invalid email', () => {
    expect(() => validateEnquiry({ ...validEnquiry, work_email: 'not-an-email' })).toThrow(
      ValidationError,
    );
  });

  it('rejects an interest value outside the canonical product list', () => {
    expect(() => validateEnquiry({ ...validEnquiry, interest: 'made_up_product' })).toThrow(
      ValidationError,
    );
  });

  it('rejects when the honeypot field is filled', () => {
    expect(() => validateEnquiry({ ...validEnquiry, botcheck: 'I am a bot' })).toThrow(
      ValidationError,
    );
  });

  it('strips HTML-like markup from free-text fields', () => {
    const result = validateEnquiry({ ...validEnquiry, goal: '<script>alert(1)</script>Hello' });
    expect(result.goal).toBe('alert(1)Hello');
  });

  it('passes through UTM fields when present, omits them when absent', () => {
    const withUtm = validateEnquiry({ ...validEnquiry, utm_source: 'linkedin' });
    expect(withUtm.utm_source).toBe('linkedin');
    const withoutUtm = validateEnquiry(validEnquiry);
    expect(withoutUtm.utm_source).toBeUndefined();
  });
});

describe('validateSubscribe', () => {
  it('accepts a valid email and defaults source to website_form', () => {
    const result = validateSubscribe({ email: 'a@b.com' });
    expect(result.email).toBe('a@b.com');
    expect(result.source).toBe('website_form');
  });

  it('rejects an invalid email', () => {
    expect(() => validateSubscribe({ email: 'nope' })).toThrow(ValidationError);
  });

  it('rejects when the honeypot field is filled', () => {
    expect(() => validateSubscribe({ email: 'a@b.com', botcheck: 'spam' })).toThrow(
      ValidationError,
    );
  });

  it('respects an explicit source over the default', () => {
    const result = validateSubscribe({ email: 'a@b.com', source: 'footer_newsletter' });
    expect(result.source).toBe('footer_newsletter');
  });
});
