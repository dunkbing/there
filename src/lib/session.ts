import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session;
}
