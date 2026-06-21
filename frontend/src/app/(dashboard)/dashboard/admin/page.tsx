import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUsers } from "@/lib/actions/admin"
import { isAdminEmail } from "@/lib/admin"
import { UserToggle } from "@/components/UserToggle"
import { GrantMinutesForm } from "@/components/GrantMinutesForm"
import { formatMinutes } from "@/lib/quota"

export const metadata = { title: "Admin — viEduco" }

export default async function AdminPage() {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) redirect("/dashboard")

  const users = await getUsers()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500 mt-1">{users.length} user{users.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-5 py-3 font-semibold text-slate-500 font-normal">User</th>
              <th className="px-5 py-3 font-semibold text-slate-500 font-normal">Transcriptions</th>
              <th className="px-5 py-3 font-semibold text-slate-500 font-normal">Joined</th>
              <th className="px-5 py-3 font-semibold text-slate-500 font-normal">Status</th>
              <th className="px-5 py-3 font-semibold text-slate-500 font-normal">Upload time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-800">{u.name ?? "—"}</p>
                  <p className="text-slate-400 text-xs">{u.email}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{u._count.transcriptions}</td>
                <td className="px-5 py-3.5 text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3.5">
                  {u.email === session!.user!.email ? (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700">You</span>
                  ) : (
                    <UserToggle userId={u.id} active={u.active} />
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {isAdminEmail(u.email) ? (
                    <span className="text-slate-400 text-xs">Unlimited</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-slate-500 text-xs">
                        {formatMinutes(u.uploadSecondsUsed)} / {formatMinutes(u.uploadLimitSeconds)} used
                      </p>
                      <GrantMinutesForm userId={u.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
