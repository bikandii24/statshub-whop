import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { readUsers, writeUsers } from "@/lib/storage"

const JWT_SECRET = process.env.JWT_SECRET ?? "statshub-dev-secret-change-in-prod"

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
}

export interface UserSession {
  id: string
  email: string
  name: string
}

export async function createUser(email: string, name: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const users = await readUsers()
  if (users.find((u: User) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: "Este email ya está registrado" }
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: new Date().toISOString()
  }
  users.push(newUser)
  await writeUsers(users)
  return { success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } }
}

export async function verifyUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const users = await readUsers()
  const user = users.find((u: User) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return { success: false, error: "Email o contraseña incorrectos" }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return { success: false, error: "Email o contraseña incorrectos" }
  return { success: true, user: { id: user.id, email: user.email, name: user.name } }
}

export function signToken(user: UserSession): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30d" })
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession
  } catch {
    return null
  }
}
