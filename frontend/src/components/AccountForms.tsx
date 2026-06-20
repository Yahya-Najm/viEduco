"use client"

import { useActionState } from "react"
import { updateProfileAction, setPasswordAction } from "@/lib/actions/account"

type ProfileData = {
  name: string | null
  image: string | null
  organization: string | null
  jobTitle: string | null
  hasPassword: boolean
}

export default function AccountForms({ profile }: { profile: ProfileData }) {
  const [profileError, profileFormAction, profilePending] = useActionState(updateProfileAction, null)
  const [passwordError, passwordFormAction, passwordPending] = useActionState(setPasswordAction, null)

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <section className="rounded-2xl bg-white border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Profile</h2>
        <p className="text-sm text-slate-500 mb-5">Update your personal and organization details.</p>

        {profileError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-600 font-medium">
            {profileError}
          </div>
        )}

        <form action={profileFormAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={profile.name ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="image" className="text-sm font-medium text-slate-700">Avatar URL</label>
            <input
              id="image"
              name="image"
              type="url"
              placeholder="https://…"
              defaultValue={profile.image ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="organization" className="text-sm font-medium text-slate-700">Organization</label>
            <input
              id="organization"
              name="organization"
              type="text"
              placeholder="Acme Inc."
              defaultValue={profile.organization ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="jobTitle" className="text-sm font-medium text-slate-700">Role / job title</label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              placeholder="Product Manager"
              defaultValue={profile.jobTitle ?? ""}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={profilePending}
            className="mt-2 w-full sm:w-auto self-start rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
          >
            {profilePending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {profile.hasPassword ? "Change password" : "Set a password"}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {profile.hasPassword
            ? "Update the password used to sign in with email and password."
            : "You signed up with Google. Set a password to also sign in with email and password."}
        </p>

        {passwordError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-600 font-medium">
            {passwordError}
          </div>
        )}

        <form action={passwordFormAction} className="flex flex-col gap-4">
          {profile.hasPassword && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="currentPassword" className="text-sm font-medium text-slate-700">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
              New password <span className="ml-1.5 text-slate-400 font-normal text-xs">(min. 8 characters)</span>
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-slate-700">Confirm new password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={passwordPending}
            className="mt-2 w-full sm:w-auto self-start rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
          >
            {passwordPending ? "Saving…" : profile.hasPassword ? "Update password" : "Set password"}
          </button>
        </form>
      </section>
    </div>
  )
}
