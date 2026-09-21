import { SignJWT, jwtVerify } from "jose";
import type { LearnerKind } from "./domain.js";

export interface AuthClaims {
  learnerId: string;
  kind: LearnerKind;
}

export function createAuth(secret: string) {
  const key = new TextEncoder().encode(secret);

  return {
    async sign(claims: AuthClaims): Promise<string> {
      return new SignJWT({ kind: claims.kind })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.learnerId)
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(key);
    },
    async verify(token: string): Promise<AuthClaims> {
      const { payload } = await jwtVerify(token, key);
      if (!payload.sub || (payload.kind !== "guest" && payload.kind !== "registered")) {
        throw new Error("Invalid access token");
      }
      return { learnerId: payload.sub, kind: payload.kind };
    },
  };
}

export type AuthService = ReturnType<typeof createAuth>;
