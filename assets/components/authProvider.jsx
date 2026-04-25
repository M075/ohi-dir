"use client";
import { SessionProvider } from "next-auth/react";

const AuthProvider = ({ children }) => {
  return <SessionProvider data-oid="c1u1kqb">{children}</SessionProvider>;
};

export default AuthProvider;
