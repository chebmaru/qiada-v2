"use client";

import { useState, useEffect } from "react";
import { getProfile, type UserProfile } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";

export interface SubscriptionState {
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  hasSubscription: boolean;
  subscriptionExpired: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
  profile: UserProfile | null;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    isLoggedIn: false,
    isAdmin: false,
    hasSubscription: false,
    subscriptionExpired: false,
    expiresAt: null,
    daysRemaining: null,
    profile: null,
  });

  useEffect(() => {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // Admin bypasses everything
    if (user.role === "admin") {
      setState((s) => ({
        ...s,
        loading: false,
        isLoggedIn: true,
        isAdmin: true,
        hasSubscription: true,
      }));
      return;
    }

    getProfile(token)
      .then((profile) => {
        const now = new Date();
        const expiresAt = profile.subscription?.expiresAt
          ? new Date(profile.subscription.expiresAt)
          : null;
        const hasSubscription = !!expiresAt && expiresAt > now;
        const daysRemaining = expiresAt && hasSubscription
          ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        setState({
          loading: false,
          isLoggedIn: true,
          isAdmin: false,
          hasSubscription,
          subscriptionExpired: !!profile.subscriptionExpired,
          expiresAt,
          daysRemaining,
          profile,
        });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false, isLoggedIn: true }));
      });
  }, []);

  return state;
}
