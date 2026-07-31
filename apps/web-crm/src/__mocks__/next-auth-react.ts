import React from "react";

export const useSession = jest.fn(() => ({
  data: {
    user: { name: "Bren Raphael", email: "bren@example.com" },
    isSuperUser: true,
    permissions: {
      CRMS: {
        Dashboard: { canRead: true },
        "Customer Profiles": { canRead: true },
        Conversations: { canRead: true },
        Tickets: { canRead: true },
        Campaigns: { canRead: true },
      },
    },
  },
  status: "authenticated",
}));

export const signIn = jest.fn();
export const signOut = jest.fn();
export const getSession = jest.fn();
export const getCsrfToken = jest.fn();
export const getProviders = jest.fn();

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => children;
