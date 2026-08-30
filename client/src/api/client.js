/**
 * api/client.js
 * -----------------------------------------------------------------------
 * A single shared axios instance for all API calls to the EERoom
 * backend. Two things happen here that would otherwise be repeated in
 * every component:
 *
 *   1. Base URL is set once (from an env var), so components just call
 *      client.get("/projects") instead of the full URL every time.
 *   2. A request interceptor automatically attaches the JWT from
 *      localStorage as an Authorization header on every outgoing
 *      request, so individual components never have to remember to do
 *      it themselves.
 *
 * Interceptor pattern source: this is axios's own documented pattern
 * for auth headers -
 * https://axios-http.com/docs/interceptors
 * -----------------------------------------------------------------------
 */

import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("eeroom_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;