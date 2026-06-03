const API_PATH = '/api/v1';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configuredUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || '');

  if (!configuredUrl) {
    return API_PATH;
  }

  if (configuredUrl.endsWith(API_PATH)) {
    return configuredUrl;
  }

  if (configuredUrl.endsWith('/api')) {
    return `${configuredUrl}/v1`;
  }

  return `${configuredUrl}${API_PATH}`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const API_SERVER_URL =
  API_BASE_URL.endsWith(API_PATH)
    ? API_BASE_URL.slice(0, -API_PATH.length) || '/'
    : API_BASE_URL;
