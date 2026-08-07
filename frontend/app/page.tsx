import { redirect } from "next/navigation";

// SRS §9: "The application should not have a traditional dashboard...
// redirected directly to the Rate Card Management page." This applies both
// after login and whenever the app logo is clicked (§10).
export default function RootPage() {
  redirect("/rate-card");
}
