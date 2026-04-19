// Access Required page — redirects to home in public mode

import { redirect } from "next/navigation"

export default function AccessRequiredPage() {
  redirect("/")
}
