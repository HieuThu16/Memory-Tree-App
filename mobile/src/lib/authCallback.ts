import * as ExpoLinking from "expo-linking";

type AuthCallbackResult =
  | {
      type: "code";
      code: string;
    }
  | {
      type: "session";
      accessToken: string;
      refreshToken: string;
    };

function parseParams(raw: string) {
  return raw
    .split("&")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const [rawKey, ...rawValueParts] = entry.split("=");
      if (!rawKey) {
        return accumulator;
      }

      const key = decodeURIComponent(rawKey);
      const value = decodeURIComponent(rawValueParts.join("="));
      accumulator[key] = value;
      return accumulator;
    }, {});
}

export function parseAuthCallback(url: string): AuthCallbackResult | null {
  const parsedUrl = ExpoLinking.parse(url);
  const normalizedPath = [parsedUrl.hostname, parsedUrl.path]
    .filter(Boolean)
    .join("/")
    .replace(/\/+$/, "");

  if (normalizedPath !== "auth/callback") {
    return null;
  }

  const codeParam = parsedUrl.queryParams?.code;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
  if (code) {
    return {
      type: "code",
      code,
    };
  }

  const fragmentIndex = url.indexOf("#");
  if (fragmentIndex === -1) {
    return null;
  }

  const fragment = url.slice(fragmentIndex + 1);
  const params = parseParams(fragment);

  if (params.access_token && params.refresh_token) {
    return {
      type: "session",
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
    };
  }

  return null;
}
