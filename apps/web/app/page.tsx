import { redirect } from "next/navigation";

// Root "/" redirects to dashboard (middleware handles unauthenticated → /login)
export default function RootPage() {
  redirect("/dashboard");
}
