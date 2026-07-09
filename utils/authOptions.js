// utils/authOptions.js - Updated to include role
import NextAuth from "next-auth/next"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import CredentialsProvider from "next-auth/providers/credentials"
import User from '@/models/User';
import connectDB from '@/config/database';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectDB();
        
        const user = await User.findOne({ 
          email: credentials.email.toLowerCase().trim() 
        }).select('+password');
        
        if (!user) {
          throw new Error('No user found with this email');
        }
        
        if (!user.password) {
          throw new Error('This account does not have a password. Please sign in with Google or Facebook.');
        }
        
        const isPasswordValid = await user.comparePassword(credentials.password);
        
        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.storename,
          image: user.image,
          isOnboarded: user.isOnboarded || false,
          role: user.role || 'buyer', // ADDED
          isAdmin: user.isAdmin || false,
          adminRole: user.adminRole || null,
        };
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      await connectDB();

      const userExists = await User.findOne({
        email: user.email || profile?.email
      });

      if (!userExists) {
        const emailLocal = (user.email || profile?.email || '').split('@')[0] || '';
        const defaultStoreName = emailLocal
          .replace(/\./g, ' ')
          .replace(/[^a-z0-9-_]/gi, '')
          .toLowerCase();

        const newUser = await User.create({
          email: user.email || profile?.email,
          storename: defaultStoreName,
          image: user.image || profile?.picture,
          isOnboarded: false,
          authProvider: account.provider,
          role: 'buyer', // Default to buyer
        });

        // Override the OAuth provider ID with MongoDB _id so the JWT token
        // stores the correct user identifier for database queries.
        user.id = newUser._id.toString();
        user.role = newUser.role;
        user.isAdmin = newUser.isAdmin || false;
        user.adminRole = newUser.adminRole || null;
      } else {
        user.id = userExists._id.toString();
        user.role = userExists.role || 'buyer';
        user.isAdmin = userExists.isAdmin || false;
        user.adminRole = userExists.adminRole || null;
      }

      return true;
    },

    async session({ session, token }) {
      // With JWT strategy, the token already has all user data.
      // Avoid a database round-trip on EVERY page navigation.
      if (token) {
        session.user.id = token.id || token.sub;
        session.user.isOnboarded = token.isOnboarded;
        session.user.storename = token.storename;
        session.user.role = token.role || 'buyer';
        session.user.isAdmin = token.isAdmin || false;
        session.user.adminRole = token.adminRole || null;
        session.user.adminPermissions = token.adminPermissions || [];
      }

      return session;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.isOnboarded = user.isOnboarded;
        token.role = user.role || 'buyer'; // ADDED
        token.isAdmin = user.isAdmin || false;
        token.adminRole = user.adminRole || null;
      }
      
      if (trigger === 'update' && session) {
        if (session.user) {
          token.role = session.user.role ?? token.role;
          token.isAdmin = session.user.isAdmin ?? token.isAdmin;
          token.adminRole = session.user.adminRole ?? token.adminRole;
          token.isOnboarded = session.user.isOnboarded ?? token.isOnboarded;
          token.storename = session.user.storename ?? token.storename;
        }
      }
      
      // Migration: tokens created before signIn overrode the user id with MongoDB
      // ObjectId still hold the OAuth provider's numeric ID. Fix it once.
      if (token.email && token.id && !/^[0-9a-f]{24}$/i.test(token.id)) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email }).select('_id role');
          if (dbUser) {
            token.id = dbUser._id.toString();
            if (!token.role) token.role = dbUser.role || 'buyer';
          }
        } catch {
          // Network down — skip migration, next refresh will retry.
        }
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },

  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
    newUser: '/onboarding',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)