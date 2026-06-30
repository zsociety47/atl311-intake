import type { NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

declare module 'next-auth' {
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
      if (user) token.role = (user as { role: string }).role
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
}
