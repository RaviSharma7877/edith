import type { NextAuthOptions, Session, User } from "next-auth"
import type { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"

// Extend session/JWT types with our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      isFirstLogin: boolean
      showWelcomeScreen: boolean
      onboardingStep: number
    }
  }
  interface User {
    isFirstLogin?: boolean
    showWelcomeScreen?: boolean
    onboardingStep?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isFirstLogin: boolean
    showWelcomeScreen: boolean
    onboardingStep: number
  }
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn:  "/login",
    newUser: "/onboarding",
    error:   "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // ── Credentials (email + password) ──────────────────────────────────────
    CredentialsProvider({
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password

        if (!email || !password || password.length < 6) return null

        // TODO: replace stub with real DB lookup + bcrypt.compare(password, user.passwordHash)
        // const user = await prisma.user.findUnique({ where: { email } })
        // if (!user?.passwordHash) return null
        // const valid = await bcrypt.compare(password, user.passwordHash)
        // if (!valid) return null

        return {
          id:                email,
          email,
          name:              email.split("@")[0],
          isFirstLogin:      true,
          showWelcomeScreen: true,
          onboardingStep:    0,
        }
      },
    }),

    // ── Google OAuth ─────────────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt:        "consent",
                access_type:   "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),

    // ── GitHub OAuth ──────────────────────────────────────────────────────────
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId:     process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    // Persist custom fields into the JWT on sign-in
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id                = user.id
        token.isFirstLogin      = user.isFirstLogin      ?? true
        token.showWelcomeScreen = user.showWelcomeScreen ?? true
        token.onboardingStep    = user.onboardingStep    ?? 0
      }

      // OAuth sign-in — populate fields from profile
      if (account?.provider === "google" || account?.provider === "github") {
        token.isFirstLogin      = true
        token.showWelcomeScreen = true
        token.onboardingStep    = 0
        // TODO: upsert user + OAuthAccount in DB; check if existing to set isFirstLogin false
      }

      // When client calls update() to mark onboarding done
      if (trigger === "update" && token) {
        // token fields can be updated via session update() from client
      }

      return token
    },

    // Expose custom fields on the session object
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user.id                = token.id
      session.user.isFirstLogin      = token.isFirstLogin
      session.user.showWelcomeScreen = token.showWelcomeScreen
      session.user.onboardingStep    = token.onboardingStep
      return session
    },
  },
}
