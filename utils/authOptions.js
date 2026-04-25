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
        
        user.role = newUser.role;
        user.isAdmin = newUser.isAdmin || false;
        user.adminRole = newUser.adminRole || null;
      } else {
        user.role = userExists.role || 'buyer';
        user.isAdmin = userExists.isAdmin || false;
        user.adminRole = userExists.adminRole || null;
      }
      
      return true;
    },

    async session({ session, token }) {
      await connectDB();
      
      let user = await User.findOne({ email: session.user.email });
      
      if (!user) {
        try {
          const emailLocal = (session.user.email || '').split('@')[0] || '';
          const defaultStoreName = emailLocal
            .replace(/\./g, ' ')
            .replace(/[^a-z0-9-_]/gi, '')
            .toLowerCase();
          
          user = await User.create({
            email: session.user.email,
            storename: defaultStoreName,
            image: session.user.image,
            isOnboarded: false,
            authProvider: 'oauth',
            role: 'buyer',
          });
        } catch (error) {
          console.error('Error creating user in session callback:', error);
          return session;
        }
      }
      
      if (user) {
        session.user.id = user._id.toString();
        session.user.isOnboarded = user.isOnboarded || false;
        session.user.storename = user.storename;
        session.user.role = user.role || 'buyer'; // ADDED
        session.user.isAdmin = user.isAdmin || false;
        session.user.adminRole = user.adminRole || null;
        session.user.adminPermissions = user.adminPermissions || [];
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
        token.isOnboarded = session.user.isOnboarded;
        token.storename = session.user.storename;
        token.role = session.user.role; // ADDED
        token.isAdmin = session.user.isAdmin;
        token.adminRole = session.user.adminRole;
      }
      
      if (token.email && !token.role) {
        try {
          await connectDB();
          const user = await User.findOne({ email: token.email });
          if (user) {
            token.isOnboarded = user.isOnboarded || false;
            token.storename = user.storename;
            token.role = user.role || 'buyer'; // ADDED
            token.isAdmin = user.isAdmin || false;
            token.adminRole = user.adminRole || null;
          }
        } catch (error) {
          console.error('JWT callback error:', error);
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