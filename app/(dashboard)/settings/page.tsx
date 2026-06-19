"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, Users, Mail, Lock, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface TeamMember {
  id: string
  name: string
  email: string
  createdAt: string
}

export default function SettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState("")

  // Add member dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addName, setAddName] = useState("")
  const [addEmail, setAddEmail] = useState("")
  const [addPassword, setAddPassword] = useState("")
  const [addConfirm, setAddConfirm] = useState("")
  const [adding, setAdding] = useState(false)

  // Change password dialog
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [changingPwd, setChangingPwd] = useState(false)

  const supabase = createClient()

  // Load current user and team members
  useEffect(() => {
    async function loadData() {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.email) setCurrentUserEmail(user.email)

        // Get all team members
        const res = await fetch("/api/users")
        if (res.ok) {
          const data = await res.json()
          setMembers(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error(err)
        toast.error("Failed to load team members")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [supabase])

  async function handleAddMember() {
    if (!addName.trim()) {
      toast.error("Name is required")
      return
    }
    if (!addEmail.trim()) {
      toast.error("Email is required")
      return
    }
    if (!addPassword || addPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (addPassword !== addConfirm) {
      toast.error("Passwords do not match")
      return
    }

    setAdding(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add member")
      }

      const newMember = await res.json()
      setMembers((prev) => [...prev, newMember])
      toast.success(`Added ${addName}!`)
      setAddDialogOpen(false)
      setAddName("")
      setAddEmail("")
      setAddPassword("")
      setAddConfirm("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team?`)) return

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove member")

      setMembers((prev) => prev.filter((m) => m.id !== id))
      toast.success(`Removed ${name}`)
    } catch (err) {
      toast.error("Failed to remove member")
    }
  }

  async function handleChangePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error("All fields are required")
      return
    }
    if (newPwd.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match")
      return
    }

    setChangingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error

      toast.success("Password updated!")
      setPwdDialogOpen(false)
      setCurrentPwd("")
      setNewPwd("")
      setConfirmPwd("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setChangingPwd(false)
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      toast.success("Signed out")
      window.location.href = "/login"
    } catch (err) {
      toast.error("Failed to sign out")
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your team and account</p>
      </div>

      {/* Current User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">{currentUserEmail}</p>
              <p className="text-xs text-gray-500 mt-0.5">Full access to all features</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              onClick={() => setPwdDialogOpen(true)}
              variant="outline"
              className="w-full h-11"
            >
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full h-11">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your account password. Must be at least 8 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Current Password *</Label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>New Password *</Label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Confirm Password *</Label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setPwdDialogOpen(false)} variant="outline" className="h-11">
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPwd}
              className="h-11"
            >
              {changingPwd ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Team Members</CardTitle>
          <Badge variant="secondary">{members.length}</Badge>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="space-y-2 mb-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </p>
                  </div>

                  {member.email !== currentUserEmail && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
                      aria-label="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No team members yet</p>
            </div>
          )}

          <Button
            onClick={() => setAddDialogOpen(true)}
            className="w-full h-11"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new team member with email and password. They will have full access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. Ahmed Khan"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="e.g. ahmed@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Confirm Password *</Label>
              <Input
                type="password"
                placeholder="Re-enter password"
                value={addConfirm}
                onChange={(e) => setAddConfirm(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <p>✓ This member will have full access to all features</p>
              <p>✓ They can log in with their email & password</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setAddDialogOpen(false)} variant="outline" className="h-11">
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={adding} className="h-11">
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900 mb-1">👥 Adding Team Members</p>
            <p>Enter their name, email, and password. They can then log in from any device.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">🔐 Access & Security</p>
            <p>All team members have identical, complete access. Everyone sees everything.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">📱 Login Anywhere</p>
            <p>Each person logs in with their own credentials. Perfect for shop workers with phones.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
