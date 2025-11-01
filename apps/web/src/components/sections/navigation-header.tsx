"use client";

import Link from "next/link";
import { ChevronDown, Menu, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useSession } from "@/lib/auth";
import UploadDialog from "@/components/ui/upload-dialog";
import AuthDialog from "@/components/auth/AuthDialog";
import UserMenu from "@/components/auth/UserMenu";

const NavigationHeader = () => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { data: session, isPending } = useSession();

  const navItems = [
    { href: "/notebooks", label: "Notebooks" },
    { href: "/collections", label: "Collections" },
    { href: "/authors", label: "Authors" },
  ];

  return (
    <header className="fixed top-0 z-20 w-full bg-background/30 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between px-6 py-2">
        <Link href="/" className="font-mono text-sm font-medium text-foreground">
          Supernotebooklm
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setUploadOpen(true)}
              variant="outline"
              className="h-8 rounded-full px-4 text-sm font-medium"
            >
              <Upload className="h-3 w-3 mr-2" />
              Upload
            </Button>
            
            {isPending ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : session ? (
              <UserMenu />
            ) : (
              <Button 
                onClick={() => setAuthDialogOpen(true)}
                className="h-8 rounded-full bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                Sign In
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[80vw] max-w-xs bg-background border-l-border"
            >
              <nav className="flex flex-col space-y-6 pt-8">
                {navItems.map((item) => (
                  <Link
                    key={`mobile-${item.href}`}
                    href={item.href}
                    className="text-lg font-medium text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                <Button
                  onClick={() => setUploadOpen(true)}
                  variant="outline"
                  className="rounded-full"
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Upload
                </Button>
                <div className="pt-6">
                  {isPending ? (
                    <div className="h-10 w-full rounded-full bg-muted animate-pulse" />
                  ) : session ? (
                    <Link href="/account">
                      <Button className="w-full rounded-full bg-white text-black hover:bg-white/90">
                        My Account
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      onClick={() => setAuthDialogOpen(true)}
                      className="w-full rounded-full bg-white text-black hover:bg-white/90"
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </header>
  );
};

export default NavigationHeader;