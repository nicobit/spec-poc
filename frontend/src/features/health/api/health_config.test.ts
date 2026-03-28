import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetchMock, ensureOkMock, getJsonMock, apiUrlMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
  ensureOkMock: vi.fn(async (response: Response) => response),
  getJsonMock: vi.fn(),
  apiUrlMock: vi.fn((path: string) => `https://example.test${path}`),
}));

vi.mock('@/shared/api/client', () => ({
  authFetch: (...args: any[]) => (authFetchMock as any)(...args),
  ensureOk: (...args: any[]) => (ensureOkMock as any)(...args),
  getJson: (...args: any[]) => (getJsonMock as any)(...args),
  apiUrl: (...args: any[]) => (apiUrlMock as any)(...args),
}));

import { HealthConfigApi, validateConfig } from './health_config';

describe('HealthConfigApi', () => {
  const instance = {} as never;

  beforeEach(() => {
    authFetchMock.mockReset();
    ensureOkMock.mockClear();
    getJsonMock.mockReset();
    apiUrlMock.mockClear();
  });

  it('stores the returned etag from getConfig and reuses it on writes', async () => {
    const getConfigResponse = {
      json: vi.fn().mockResolvedValue({
        etag: 'etag-1',
        config: { services: [] },
      }),
    } as unknown as Response;
    const updateResponse = {
      json: vi.fn().mockResolvedValue({
        etag: 'etag-2',
        config: { services: [] },
      }),
    } as unknown as Response;

    authFetchMock
      .mockResolvedValueOnce(getConfigResponse)
      .mockResolvedValueOnce(updateResponse);

    const api = new HealthConfigApi(instance);

    await api.getConfig();
    await api.putConfig({ services: [] });

    expect(authFetchMock).toHaveBeenNthCalledWith(
      2,
      instance,
      'https://example.test/health/config',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'If-Match': 'etag-1' },
      }),
    );
    expect(api.currentEtag).toBe('etag-2');
  });

  it('posts validation requests through the shared client', async () => {
    getJsonMock.mockResolvedValue({ ok: true, errors: [] });

    const result = await validateConfig(instance, { services: [] });

    expect(authFetchMock).toHaveBeenCalledWith(
      instance,
      'https://example.test/health/config/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ services: [] }),
      }),
    );
    expect(result).toEqual({ ok: true, errors: [] });
  });
});
