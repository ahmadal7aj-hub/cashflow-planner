import { useState } from 'react';

import { Field } from '../components/forms';
import { Body, Button, Heading, Screen } from '../components/ui';
import {
  codeProblem,
  emailProblem,
  normalizeCode,
  normalizeEmail,
  normalizeUsername,
  passwordProblem,
  usernameProblem,
} from '../domain/accountValidation';
import { AuthError } from '../backend/types';
import { t } from '../i18n/strings';
import { useAccount } from '../state/AccountContext';

type Step = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const e = t.auth.errors;

export function authErrorText(err: unknown): string {
  if (!(err instanceof AuthError)) return e.unknown;
  switch (err.code) {
    case 'invalid_credentials':
      return e.credentials;
    case 'email_not_verified':
      return e.notVerified;
    case 'invalid_code':
      return e.codeWrong;
    case 'email_taken':
      return e.emailTaken;
    case 'username_taken':
      return e.usernameTaken;
    case 'weak_password':
      return e.passwordWeak;
    case 'rate_limited':
      return e.rateLimited;
    case 'network':
      return e.network;
    default:
      return e.unknown;
  }
}

function usernameMessage(input: string): string | undefined {
  switch (usernameProblem(input)) {
    case 'empty':
      return e.usernameEmpty;
    case 'length':
      return e.usernameLength;
    case 'characters':
      return e.usernameCharacters;
    default:
      return undefined;
  }
}

function emailMessage(input: string): string | undefined {
  switch (emailProblem(input)) {
    case 'empty':
      return e.emailEmpty;
    case 'invalid':
      return e.emailInvalid;
    default:
      return undefined;
  }
}

function passwordMessage(
  input: string,
  context: { email?: string; username?: string },
): string | undefined {
  switch (passwordProblem(input, context)) {
    case 'empty':
      return e.passwordEmpty;
    case 'short':
      return e.passwordShort;
    case 'long':
      return e.passwordLong;
    case 'same-as-email':
      return e.passwordSameAsEmail;
    case 'same-as-username':
      return e.passwordSameAsUsername;
    default:
      return undefined;
  }
}

function codeMessage(input: string): string | undefined {
  switch (codeProblem(input)) {
    case 'empty':
      return e.codeEmpty;
    case 'invalid':
      return e.codeInvalid;
    default:
      return undefined;
  }
}

/**
 * Registration, sign in, email verification and password reset. Shown instead of the app while nobody is signed in.
 * Verification and reset use a one-time code from the email that is typed in here.
 */
export function AuthFlow() {
  const account = useAccount();
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (next: Step) => {
    setStep(next);
    setErrors({});
    setNotice(null);
    setCode('');
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = () =>
    run(async () => {
      const next: Record<string, string | undefined> = {
        email: emailMessage(email),
        password: password === '' ? e.passwordEmpty : undefined,
      };
      setErrors(next);
      if (next['email'] || next['password']) return;
      try {
        await account.signIn(normalizeEmail(email), password);
      } catch (err) {
        if (err instanceof AuthError && err.code === 'email_not_verified') {
          setErrors({});
          setNotice(e.notVerified);
          setStep('verify');
          return;
        }
        setErrors({ form: authErrorText(err) });
      }
    });

  const submitRegister = () =>
    run(async () => {
      const next: Record<string, string | undefined> = {
        username: usernameMessage(username),
        email: emailMessage(email),
        password: passwordMessage(password, { email, username }),
      };
      setErrors(next);
      if (next['username'] || next['email'] || next['password']) return;
      try {
        if (!(await account.usernameAvailable(normalizeUsername(username)))) {
          setErrors({ username: e.usernameTaken });
          return;
        }
        const result = await account.signUp(
          normalizeEmail(email),
          password,
          normalizeUsername(username),
        );
        if (result === 'verification-sent') {
          setErrors({});
          setStep('verify');
        }
      } catch (err) {
        if (err instanceof AuthError && err.code === 'username_taken')
          setErrors({ username: e.usernameTaken });
        else if (err instanceof AuthError && err.code === 'email_taken')
          setErrors({ email: e.emailTaken });
        else setErrors({ form: authErrorText(err) });
      }
    });

  const submitVerify = () =>
    run(async () => {
      const message = codeMessage(code);
      setErrors({ code: message });
      if (message) return;
      try {
        await account.verifySignUp(normalizeEmail(email), normalizeCode(code));
      } catch (err) {
        setErrors({ form: authErrorText(err) });
      }
    });

  const resend = () =>
    run(async () => {
      try {
        await account.resendCode(normalizeEmail(email));
        setErrors({});
        setNotice(t.auth.resent);
      } catch (err) {
        setErrors({ form: authErrorText(err) });
      }
    });

  const submitForgot = () =>
    run(async () => {
      const message = emailMessage(email);
      setErrors({ email: message });
      if (message) return;
      await account.requestReset(normalizeEmail(email)).catch(() => undefined);
      setStep('reset');
    });

  const submitReset = () =>
    run(async () => {
      const next: Record<string, string | undefined> = {
        code: codeMessage(code),
        password: passwordMessage(password, { email }),
      };
      setErrors(next);
      if (next['code'] || next['password']) return;
      try {
        await account.resetPassword(normalizeEmail(email), normalizeCode(code), password);
      } catch (err) {
        setErrors({ form: authErrorText(err) });
      }
    });

  const emailField = (
    <Field
      label={t.auth.email}
      testID="auth-email"
      value={email}
      onChangeText={setEmail}
      error={errors['email']}
      keyboardType="email-address"
    />
  );
  const formError = errors['form'] ? (
    <Body testID="auth-form-error" accessibilityLiveRegion="polite">
      {errors['form']}
    </Body>
  ) : null;
  const noticeText = notice ? <Body testID="auth-notice">{notice}</Body> : null;

  if (step === 'register') {
    return (
      <Screen testID="auth-register">
        <Heading>{t.auth.registerTitle}</Heading>
        <Body muted>{t.auth.registerIntro}</Body>
        <Field
          label={t.auth.username}
          hint={t.auth.usernameHint}
          testID="auth-username"
          value={username}
          onChangeText={setUsername}
          error={errors['username']}
        />
        {emailField}
        <Field
          label={t.auth.password}
          hint={t.auth.passwordHint}
          testID="auth-password"
          value={password}
          onChangeText={setPassword}
          error={errors['password']}
          secure
        />
        {formError}
        <Button
          label={busy ? t.auth.checking : t.auth.register}
          onPress={submitRegister}
          testID="auth-submit"
        />
        <Button
          label={t.auth.toLogin}
          variant="secondary"
          onPress={() => go('login')}
          testID="auth-to-login"
        />
      </Screen>
    );
  }

  if (step === 'verify') {
    return (
      <Screen testID="auth-verify">
        <Heading>{t.auth.verifyTitle}</Heading>
        <Body muted>{t.auth.verifyIntro(normalizeEmail(email))}</Body>
        {noticeText}
        <Field
          label={t.auth.code}
          hint={t.auth.codeHint}
          testID="auth-code"
          value={code}
          onChangeText={setCode}
          error={errors['code']}
          keyboardType="number-pad"
        />
        {formError}
        <Button label={t.auth.verify} onPress={submitVerify} testID="auth-submit" />
        <Button label={t.auth.resend} variant="secondary" onPress={resend} testID="auth-resend" />
        <Button
          label={t.auth.backToLogin}
          variant="secondary"
          onPress={() => go('login')}
          testID="auth-to-login"
        />
      </Screen>
    );
  }

  if (step === 'forgot') {
    return (
      <Screen testID="auth-forgot">
        <Heading>{t.auth.forgotTitle}</Heading>
        <Body muted>{t.auth.forgotIntro}</Body>
        {emailField}
        <Button label={t.auth.sendCode} onPress={submitForgot} testID="auth-submit" />
        <Button
          label={t.auth.backToLogin}
          variant="secondary"
          onPress={() => go('login')}
          testID="auth-to-login"
        />
      </Screen>
    );
  }

  if (step === 'reset') {
    return (
      <Screen testID="auth-reset">
        <Heading>{t.auth.resetTitle}</Heading>
        <Body muted>{t.auth.resetIntro(normalizeEmail(email))}</Body>
        <Field
          label={t.auth.code}
          hint={t.auth.codeHint}
          testID="auth-code"
          value={code}
          onChangeText={setCode}
          error={errors['code']}
          keyboardType="number-pad"
        />
        <Field
          label={t.auth.newPassword}
          hint={t.auth.passwordHint}
          testID="auth-password"
          value={password}
          onChangeText={setPassword}
          error={errors['password']}
          secure
        />
        {formError}
        <Button label={t.auth.reset} onPress={submitReset} testID="auth-submit" />
        <Button
          label={t.auth.backToLogin}
          variant="secondary"
          onPress={() => go('login')}
          testID="auth-to-login"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="auth-login">
      <Heading>{t.auth.loginTitle}</Heading>
      <Body muted>{t.auth.loginIntro}</Body>
      {noticeText}
      {emailField}
      <Field
        label={t.auth.password}
        testID="auth-password"
        value={password}
        onChangeText={setPassword}
        error={errors['password']}
        secure
      />
      {formError}
      <Button
        label={busy ? t.auth.checking : t.auth.signIn}
        onPress={submitLogin}
        testID="auth-submit"
      />
      <Button
        label={t.auth.forgot}
        variant="secondary"
        onPress={() => go('forgot')}
        testID="auth-forgot"
      />
      <Button
        label={t.auth.toRegister}
        variant="secondary"
        onPress={() => go('register')}
        testID="auth-to-register"
      />
    </Screen>
  );
}
