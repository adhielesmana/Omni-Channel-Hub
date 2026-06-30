import { logger } from "./logger";
import { toTitleCase } from "./string";

type MetaProfileResponse = {
  name?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  error?: { message?: string };
};

export type CustomerProfile = {
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

function isPlaceholderProfileName(name: string | null | undefined, channelType: "instagram" | "facebook"): boolean {
  if (!name) return true;
  return name.trim().toLowerCase() === `${channelType} user`;
}

/**
 * Fetch customer profile from Meta Graph API.
 *
 * Both Facebook PSIDs and Instagram IGSIDs resolve on graph.facebook.com.
 * graph.instagram.com does NOT work with standard page access tokens.
 *
 * Note: profile_pic only works for Facebook PSIDs, not Instagram IGSIDs.
 * For Instagram, we get name + username only.
 */
export async function fetchCustomerProfile(
  channelType: "instagram" | "facebook",
  senderId: string,
  accessToken: string,
): Promise<CustomerProfile | null> {
  const baseUrl = "https://graph.facebook.com/v21.0";
  // Instagram IGSIDs don't support profile_pic; Facebook PSIDs do
  const fields = channelType === "instagram"
    ? "name,username"
    : "first_name,last_name,profile_pic";

  const url = `${baseUrl}/${senderId}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as MetaProfileResponse;

  if (!res.ok) {
    logger.warn({ channelType, senderId, status: res.status, error: data.error?.message }, "Meta profile lookup failed");
    return null;
  }

  const rawName = channelType === "instagram"
    ? [data.name, data.username].find((name) => !isPlaceholderProfileName(name, channelType)) ?? null
    : [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

  return {
    name: rawName ? toTitleCase(rawName) : null,
    username: channelType === "instagram" ? data.username ?? null : null,
    avatarUrl: channelType === "facebook" ? data.profile_pic ?? null : null,
  };
}
