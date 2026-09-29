import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { sendOtpEndpoint } from "./sendOtpHttp";

const http = httpRouter();

auth.addHttpRoutes(http);

// POST /api/send-otp — 6-digit OTP email via Resend (see sendOtpHttp.ts).
http.route({
  path: "/api/send-otp",
  method: "POST",
  handler: sendOtpEndpoint,
});

// CORS preflight for the endpoint.
http.route({
  path: "/api/send-otp",
  method: "OPTIONS",
  handler: sendOtpEndpoint,
});

export default http;
