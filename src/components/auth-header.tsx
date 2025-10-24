"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import Link from "next/link";

export function AuthHeader() {
  const { data: session } = useSession();

  return (
    <header className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border-b border-white/20 dark:border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        >
          Focus Together
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
              <Link href="/auth/signin">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
