"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import Link from "next/link";

export function AuthHeader() {
  const { data: session } = useSession();

  return (
    <header className="backdrop-blur-xl bg-background/20 border-b border-white/10 w-full sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold ">
          There
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <div className="text-sm">
                <p className="font-medium">
                  {session.user.name || session.user.email}
                </p>
              </div>
              <Button
                onClick={() => signOut()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size={"sm"} asChild>
                <Link href="/auth/signin">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              </Button>
              <Button asChild size={"sm"} variant={"default"}>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
