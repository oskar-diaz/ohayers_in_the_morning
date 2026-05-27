export const SUPABASE_RETURN_TO_KEY = "supabase-return-to";

export function getCurrentAuthUrl() {
  const url = new URL(window.location.href);

  url.hash = "";

  return url.toString();
}

export function rememberAuthReturnTo() {
  window.localStorage.setItem(SUPABASE_RETURN_TO_KEY, getCurrentAuthUrl());
}
