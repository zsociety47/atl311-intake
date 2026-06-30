import type { NextAuthOptions, DefaultSession } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

declare module 'next-auth' {
  interface User {
    role: string
  }
  interface Session {
    user: DefaultSession['user'] & { role: string }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (
          credentials?.email === process.env.OPERATOR_EMAIL &&
          credentials?.password === process.env.OPERATOR_PASSWORD
        ) {
          return { id: '1', name: 'Operator', email: process.env.OPERATOR_EMAIL ?? '', role: 'operator' }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/operator/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
}

/**
 * Returns the operator session for a request, or null if unauthenticated.
 * Use in operator API routes to guard against unauthenticated access.
 */
export async function getOperatorSession() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'operator' ? session : null
}
