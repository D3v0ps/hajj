import { redirect } from "next/navigation";

// "Resor" och "Paketadmin" är sammanslagna till en gemensam vy (/admin/paket)
// enligt backoffice-spec. Den här routen behålls som omdirigering så gamla
// länkar/bokmärken fortsätter fungera.
export default function ResorRedirect() {
  redirect("/admin/paket");
}
