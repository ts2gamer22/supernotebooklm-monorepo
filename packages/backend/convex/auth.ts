import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: true,
});

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    trustedOrigins: [
      "chrome-extension://jegoogflhaohfcclehodbfmpfajkjlem",
      siteUrl, // Allow the Convex site URL itself
    ],
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        enabled: true,
      },
    },
    // Account linking settings
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    // Session settings
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    plugins: [
      // The Convex plugin handles JWT-based auth for Chrome extensions
      convex(),
      // NOTE: crossDomain plugin removed - it causes chrome-extension:// redirects which Chrome blocks
      // Extensions can share cookies with Convex via fetch, so crossDomain is not needed
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
