import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        isFirstLogin: session.user.isFirstLogin,
        onboardingStep: session.user.onboardingStep,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}