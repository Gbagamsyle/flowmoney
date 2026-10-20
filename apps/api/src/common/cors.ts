/** Exact browser origins only; never allow credentials with a wildcard. */
export function webOrigins(value = process.env.WEB_ORIGIN): string[] {
  if (!value?.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'WEB_ORIGIN must list the deployed web origin in production.',
      );
    }
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }
  return [
    ...new Set(
      value.split(',').map((entry) => {
        const origin = entry.trim();
        let url: URL;
        try {
          url = new URL(origin);
        } catch {
          throw new Error(
            'WEB_ORIGIN must contain comma-separated HTTP(S) origins.',
          );
        }
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== origin
        ) {
          throw new Error(
            'WEB_ORIGIN entries must be exact HTTP(S) origins without paths or trailing slashes.',
          );
        }
        return origin;
      }),
    ),
  ];
}
