import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import AccountForms from "@/components/AccountForms"

export const metadata = { title: "Account — viEduco" }

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true, organization: true, jobTitle: true, hashedPassword: true },
  })
  if (!user) redirect("/login")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile and sign-in settings.</p>
      </div>

      <AccountForms
        profile={{
          name: user.name,
          image: user.image,
          organization: user.organization,
          jobTitle: user.jobTitle,
          hasPassword: !!user.hashedPassword,
        }}
      />
    </div>
  )
}
