/**
 * utils/resetLink.js
 * -----------------------------------------------------------------------
 * Reads the recovery token out of a Supabase password reset link.
 *
 * When a user clicks the link in the reset email, Supabase sends them to
 * our /reset-password page with the details in the URL fragment (the
 * part after #), for example:
 *
 *   /reset-password#access_token=eyJ...&expires_in=3600&type=recovery
 *
 * or, if the link was bad or too old:
 *
 *   /reset-password#error=access_denied&error_code=otp_expired&error_description=...
 *
 * The fragment is never sent to any server by the browser, which is why
 * Supabase puts the token there. This file only parses it; it is kept
 * apart from the page so it can be unit tested.
 *
 * Source: URLSearchParams parses "key=value&key=value" strings, MDN -
 * https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
 * -----------------------------------------------------------------------
 */

/**
 * @param {string} hash  window.location.hash, with or without the leading #
 * @returns {{ token: string|null, error: string|null }}
 *   token is set only for a recovery link that carries an access token.
 *   error is a readable message when the link is unusable.
 */
export function parseResetLink(hash) {
  const params = new URLSearchParams((hash || "").replace(/^#/, ""));

  if (params.get("error")) {
    const description = params.get("error_description");
    return {
      token: null,
      error: description
        ? description.replace(/\+/g, " ")
        : "This reset link is invalid or has expired.",
    };
  }

  const token = params.get("access_token");

  if (!token || params.get("type") !== "recovery") {
    return {
      token: null,
      error: "This page needs the link from your password reset email.",
    };
  }

  return { token, error: null };
}
