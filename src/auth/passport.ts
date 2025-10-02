import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const callback = (accessToken: string, refreshToken: string, profile: any, done: any) => {
  return done(null, profile);
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "http://localhost:4000/api/v1/users/auth/google/callback",
    },
    callback
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj: Express.User, done) => {
  done(null, obj);
});

export default passport;
