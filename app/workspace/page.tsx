import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { WorkspaceClient } from "./workspace-client"

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions)

  return (
    <WorkspaceClient
      email={session?.user?.email}
      name={session?.user?.name}
    />
  )
}
