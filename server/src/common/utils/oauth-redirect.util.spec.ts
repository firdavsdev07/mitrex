import { Response } from 'express';
import {
  redirectWithOAuthError,
  describeOAuthError,
} from './oauth-redirect.util';

function mockResponse() {
  const redirect = jest.fn();
  return { res: { redirect } as unknown as Response, redirect };
}

describe('redirectWithOAuthError', () => {
  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it('redirects to /connections with error and message params', () => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    const { res, redirect } = mockResponse();

    redirectWithOAuthError(res, 'instagram', 'App not active');

    expect(redirect).toHaveBeenCalledWith(
      'https://app.example.com/connections?error=instagram&message=App+not+active',
    );
  });

  it('falls back to localhost:3001 when FRONTEND_URL is unset', () => {
    const { res, redirect } = mockResponse();

    redirectWithOAuthError(res, 'youtube', 'denied');

    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3001/connections?'),
    );
  });
});

describe('describeOAuthError', () => {
  it('prefers a Meta-style nested error message', () => {
    const err = { response: { data: { error: { message: 'Invalid code' } } } };
    expect(describeOAuthError(err)).toBe('Invalid code');
  });

  it('falls back to error_description (OAuth standard field)', () => {
    const err = { response: { data: { error_description: 'access_denied' } } };
    expect(describeOAuthError(err)).toBe('access_denied');
  });

  it('falls back to err.message when no structured response is present', () => {
    const err = new Error('Request failed with status code 400');
    expect(describeOAuthError(err)).toBe('Request failed with status code 400');
  });

  it('falls back to a generic message when nothing is available', () => {
    expect(describeOAuthError({})).toBe("Ulanishda noma'lum xatolik yuz berdi");
  });
});
