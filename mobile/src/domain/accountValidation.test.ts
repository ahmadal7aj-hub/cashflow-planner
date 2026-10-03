import {
  codeProblem,
  emailProblem,
  normalizeCode,
  normalizeEmail,
  normalizeUsername,
  passwordProblem,
  usernameProblem,
} from './accountValidation';

describe('usernames', () => {
  it('accepts 3 to 20 lower-case letters, digits and underscores, in any typed case', () => {
    expect(usernameProblem('abc')).toBeNull();
    expect(usernameProblem('Sara_Ahmed_01')).toBeNull();
    expect(usernameProblem('a'.repeat(20))).toBeNull();
    expect(normalizeUsername('  Sara_A ')).toBe('sara_a');
  });

  it('explains what is wrong', () => {
    expect(usernameProblem('')).toBe('empty');
    expect(usernameProblem('  ')).toBe('empty');
    expect(usernameProblem('ab')).toBe('length');
    expect(usernameProblem('a'.repeat(21))).toBe('length');
    expect(usernameProblem('has space')).toBe('characters');
    expect(usernameProblem('émile')).toBe('characters');
    expect(usernameProblem('name!')).toBe('characters');
  });
});

describe('email addresses', () => {
  it('accepts ordinary addresses and normalises case and spaces', () => {
    expect(emailProblem('a@b.co')).toBeNull();
    expect(emailProblem('first.last+tag@example.ae')).toBeNull();
    expect(normalizeEmail('  Sara@Example.COM ')).toBe('sara@example.com');
  });

  it('rejects what cannot be an address', () => {
    expect(emailProblem('')).toBe('empty');
    for (const bad of ['plain', 'a@b', '@b.co', 'a b@c.co', 'a@@b.co', 'a@b .co']) {
      expect(emailProblem(bad)).toBe('invalid');
    }
  });
});

describe('passwords', () => {
  it('needs at least 10 characters and at most 72', () => {
    expect(passwordProblem('')).toBe('empty');
    expect(passwordProblem('short123')).toBe('short');
    expect(passwordProblem('exactly-10')).toBeNull();
    expect(passwordProblem('x'.repeat(72))).toBeNull();
    expect(passwordProblem('x'.repeat(73))).toBe('long');
  });

  it('must not be the email or the username', () => {
    expect(passwordProblem('sara@example.com', { email: 'Sara@Example.com' })).toBe(
      'same-as-email',
    );
    expect(passwordProblem('sara_ahmed_1', { username: 'Sara_Ahmed_1' })).toBe('same-as-username');
  });
});

describe('email codes', () => {
  it('ignores spaces and wants digits', () => {
    expect(normalizeCode(' 123 456 ')).toBe('123456');
    expect(codeProblem('123 456')).toBeNull();
    expect(codeProblem('')).toBe('empty');
    expect(codeProblem('12ab56')).toBe('invalid');
    expect(codeProblem('123')).toBe('invalid');
  });
});
