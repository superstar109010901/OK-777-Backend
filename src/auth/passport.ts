import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import prisma from "../db/prisma";
import { hashPassword } from "../utils/bcrypt";
import { createWallet } from "../db/wallets";

function generateAlphanumericCode(length: number = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

async function ensureUserFromGoogle(profile: Profile) {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : undefined;
  const displayName = profile.displayName || "Google User";

  if (!email) {
    throw new Error("Google profile has no email");
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) return user;

  const randomPassword = await hashPassword(`${profile.id}:${Date.now()}`);

  user = await prisma.user.create({
    data: {
      email,
      password: randomPassword,
      role: "user",
      status: "active",
      email_verified: true,
      name: displayName,
      referralCode: generateAlphanumericCode(),
    },
    select: { id: true, email: true }
  });

  try { await createWallet(user.id); } catch (e) { /* ignore wallet errors here */ }
  return user;
}

const strategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/v1/users/auth/google/callback",
    passReqToCallback: true,
  },
  async (req: any, accessToken, refreshToken, profile, done) => {
    try {
      console.log(`[OAuth Strategy] Processing Google profile for: ${profile.emails?.[0]?.value}`);
      
      const user = await ensureUserFromGoogle(profile);
      console.log(`[OAuth Strategy] User ${user.id} authenticated successfully`);
      
      return done(null, {
        id: user.id,
        provider: "google",
        displayName: profile.displayName,
        emails: profile.emails,
        accessToken,
      });
    } catch (err) {
      console.error(`[OAuth Strategy] Error processing user:`, err);
      return done(err);
    }
  }
);

passport.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj: Express.User, done) => {
  done(null, obj);
});

export default passport;
