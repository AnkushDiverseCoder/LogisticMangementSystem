"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import Cookies from "js-cookie"
import authService from "@/lib/authService"

const LABEL_OPTIONS = ["admin", "employee", "supervisor",'attached']

export function SignUpForm() {
    const router = useRouter()
    const { login } = useAuth()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [displayName, setDisplayName] = useState("")
    const [password, setPassword] = useState("")
    const [labels, setLabels] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (!username || !email || !displayName || !password || labels.length === 0) {
            setError("Please fill all required fields and select at least one label.")
            setLoading(false)
            return
        }

        // Call authService register
        const res = await authService.register(username, email, password, labels, displayName)

        if (res.success && res.data) {
            // Automatically log in after signup
            const loginRes = await login(username, password)
            if (loginRes.success && loginRes.user) {
                Cookies.set("authUser", JSON.stringify(loginRes.user), { expires: 7 }) // 7 days
                router.push("/")
            } else {
                setError("User created but failed to log in.")
            }
        } else {
            setError(res.error || "Sign up failed.")
        }

        setLoading(false)
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle className="text-xl">Sign Up</CardTitle>
                    <CardDescription>Create a new account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Labels multi-select */}
                        <div className="grid gap-2">
                            <Label>Labels</Label>
                            <Select
                                value={labels.join(",")}
                                onValueChange={(val) => setLabels(val.split(","))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Labels" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LABEL_OPTIONS.map((label) => (
                                        <SelectItem key={label} value={label}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <Button type="submit" disabled={loading}>
                            {loading ? "Signing up..." : "Sign Up"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
