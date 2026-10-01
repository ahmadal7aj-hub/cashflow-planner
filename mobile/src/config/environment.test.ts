import { environmentLabel, isProduction, resolveAppEnvironment } from './environment';

describe('resolveAppEnvironment', () => {
  it.each(['development', 'staging', 'production'] as const)('accepts %s', (env) => {
    expect(resolveAppEnvironment(env)).toBe(env);
  });

  it('normalizes case and whitespace', () => {
    expect(resolveAppEnvironment('  Staging ')).toBe('staging');
  });

  it.each([undefined, '', 'prod', 'PRODUCTION!', 'test'])(
    'falls back to development for %p',
    (raw) => {
      expect(resolveAppEnvironment(raw)).toBe('development');
    },
  );
});

describe('environment helpers', () => {
  it('only treats production as production', () => {
    expect(isProduction('production')).toBe(true);
    expect(isProduction('staging')).toBe(false);
    expect(isProduction('development')).toBe(false);
  });

  it('labels non-production builds and leaves production unlabelled', () => {
    expect(environmentLabel('staging')).toBe('STAGING build');
    expect(environmentLabel('development')).toBe('DEVELOPMENT build');
    expect(environmentLabel('production')).toBe('');
  });
});
