"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowUpDown, Eye, EyeOff } from "lucide-react"
import authService from "@/lib/authService"

const LABEL_OPTIONS = ["admin", "employee", "supervisor", "attached"] as const
type LabelType = typeof LABEL_OPTIONS[number]

type User = {
  $id: string
  username: string
  email: string
  labels?: LabelType[]
  displayName?: string
  onboarding?: boolean
  password?: string
}

export default function UsersPage() {
  // Signup states
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [labels, setLabels] = useState<LabelType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // CRUD states
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [filterLabel, setFilterLabel] = useState<LabelType | "all">("all")
  const [sortAsc, setSortAsc] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Password controls for edit dialog
  const [showEditCurrentPassword, setShowEditCurrentPassword] = useState(false) // view current password
  const [editNewPassword, setEditNewPassword] = useState("") // input for new password

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await authService.fetchAllUsers()
      if (res.success) {
        setUsers(res.data as User[])
      } else {
        toast.error(res.error || "Failed to fetch users")
      }
    }
    fetchUsers()
  }, [])

  // Filter + search + sort
  const filteredUsers = useMemo(() => {
    let data = [...users]
    if (search) {
      data = data.filter(
        (u) =>
          u.username?.toLowerCase().includes(search.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filterLabel !== "all") {
      data = data.filter((u) => u.labels?.includes(filterLabel))
    }
    data.sort((a, b) =>
      sortAsc ? a.username.localeCompare(b.username) : b.username.localeCompare(a.username)
    )
    return data
  }, [users, search, filterLabel, sortAsc])

  // Signup submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    if (!username || !email || !displayName || !password || labels.length === 0) {
      setError("Please fill all required fields and select at least one label.")
      setLoading(false)
      return
    }
    const res = await authService.register(username, email, password, labels, displayName)
    if (res.success && res.data) {
      toast.success("User created")
      setUsers((prev) => [res.data as User, ...prev])
      setUsername("")
      setEmail("")
      setDisplayName("")
      setPassword("")
      setLabels([])
    } else {
      toast.error(res.error || "Sign up failed.")
    }
    setLoading(false)
  }

  // Save edit
  const handleEditSave = async () => {
    if (!editingUser) return

    try {
      // Build update payload for metadata fields (username, email, displayName, labels)
      const updates: any = {}
      if (editingUser.username !== undefined) updates.username = editingUser.username
      if (editingUser.email !== undefined) updates.email = editingUser.email
      if (editingUser.displayName !== undefined) updates.displayName = editingUser.displayName

      // authService.updateUserById expects 'labels' as the single label string in current implementation.
      // We'll send the first label if present (best-effort) to avoid breaking the service.
      if (editingUser.labels && editingUser.labels.length > 0) {
        updates.labels = editingUser.labels[0]
      }

      // Update metadata
      if (Object.keys(updates).length > 0) {
        const res = await authService.updateUserById(editingUser.$id, updates)
        if (!res.success) {
          toast.error(res.error || "Failed to update user metadata")
          return
        }
      }

      // If new password provided, call changePassword endpoint
      if (editNewPassword && editNewPassword.trim().length > 0) {
        const passRes = await authService.changePassword(editingUser.$id, editNewPassword.trim())
        if (!passRes.success) {
          toast.error(passRes.error || "Failed to change password")
          return
        }
      }

      // Reload users list after successful update(s)
      const listRes = await authService.fetchAllUsers()
      if (listRes.success && listRes.data) {
        setUsers(listRes.data as User[])
      }

      toast.success("User updated")
      setEditingUser(null)
      setEditNewPassword("") // reset
      setShowEditCurrentPassword(false)
    } catch (err: any) {
      toast.error(err?.message || "Update failed")
    }
  }

  // Delete user
  const handleDelete = async (id: string) => {
    const res = await authService.deleteUserById(id)
    if (res.success) {
      toast.success("User deleted")
      setUsers((prev) => prev.filter((u) => u.$id !== id))
    } else {
      toast.error(res.error || "Delete failed")
    }
  }

  // When opening edit dialog, reset password fields
  const openEdit = (user: User) => {
    // clone so editing doesn't mutate table data directly
    setEditingUser({ ...user })
    setEditNewPassword("")
    setShowEditCurrentPassword(false)
  }

  return (
    <div className="p-6 space-y-10">
      {/* Banner */}
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="rounded-md overflow-hidden mb-6">
          <div
            className="w-full h-44 flex items-center px-6"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(2,6,23,0.88), rgba(2,6,23,0.6)), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div>
              <h1 className="text-3xl font-semibold text-white">User Management</h1>
              <p className="text-sm text-slate-200 mt-1">Manage signups, labels, and users in one place.</p>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white border border-slate-200 rounded-md px-6 py-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>

            <div className="relative">
              <Label>Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="md:col-span-2">
              <Label>Labels</Label>
              <Select
                onValueChange={(val: LabelType) => {
                  if (!labels.includes(val)) setLabels([...labels, val])
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select labels" />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_OPTIONS.map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {labels.map((l) => (
                  <span
                    key={l}
                    className="px-2 py-1 text-xs rounded bg-slate-200 cursor-pointer"
                    onClick={() => setLabels(labels.filter((x) => x !== l))}
                  >
                    {l} ✕
                  </span>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* User Management */}
      <div className="space-y-4 container mx-auto">
        <div className="flex items-center justify-between">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Select value={filterLabel} onValueChange={(val: LabelType | "all") => setFilterLabel(val)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LABEL_OPTIONS.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortAsc(!sortAsc)}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
            </Button>
          </div>
        </div>

        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="p-2 border">Username</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Display Name</th>
              <th className="p-2 border">Labels</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.$id} className="border-t">
                <td className="p-2">{user.username}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.displayName}</td>
                <td className="p-2">{user.labels?.join(", ")}</td>
                <td className="p-2 space-x-2">
                  <Button size="sm" onClick={() => openEdit(user)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(user.$id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Username</Label>
                <Input
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Display Name</Label>
                <Input
                  value={editingUser.displayName}
                  onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                />
              </div>

              {/* Current password (view only) */}
              <div className="grid gap-2 relative">
                <Label>Current Password (view only)</Label>
                <Input
                  type={showEditCurrentPassword ? "text" : "password"}
                  value={editingUser.password || ""}
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setShowEditCurrentPassword(!showEditCurrentPassword)}
                  className="absolute right-3 top-8 text-slate-500 hover:text-slate-700"
                >
                  {showEditCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* New password */}
              <div className="grid gap-2 relative">
                <Label>New Password (leave empty to keep current)</Label>
                <Input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setEditNewPassword("")}
                  className="absolute right-3 top-8 text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>

              <div className="grid gap-2">
                <Label>Labels</Label>
                <Select
                  onValueChange={(val: LabelType) => {
                    if (!editingUser.labels?.includes(val)) {
                      setEditingUser({ ...editingUser, labels: [...(editingUser.labels || []), val] })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select labels" />
                  </SelectTrigger>
                  <SelectContent>
                    {LABEL_OPTIONS.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingUser.labels?.map((l) => (
                    <span
                      key={l}
                      className="px-2 py-1 text-xs rounded bg-slate-200 cursor-pointer"
                      onClick={() => setEditingUser({ ...editingUser, labels: editingUser.labels?.filter((x) => x !== l) })}
                    >
                      {l} ✕
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
