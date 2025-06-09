/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/lib/types/database";

interface HeaderProps {
  breadcrumbs: { label: string; href?: string }[];
}

export function Header({ breadcrumbs }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setAuthUser(authUser);
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setUser(userProfile);
      }
    };

    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {breadcrumb.href ? (
                    <BreadcrumbLink href={breadcrumb.href}>
                      {breadcrumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-4 px-4">
        {/* User Avatar with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={
                    user?.picture_url ||
                    "https://media.licdn.com/dms/image/v2/D4E03AQGeAAy1tqMunA/profile-displayphoto-shrink_400_400/B4EZZT3pJuHYAg-/0/1745163818003?e=1754524800&v=beta&t=3hO6A2Sr3AY80m-InCoKVyOfZ_5H_hJT4azu8lKHd44"
                  }
                  alt="User"
                />
                <AvatarFallback>
                  {user?.firstname?.[0]}
                  {user?.lastname?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">
                  {user?.firstname} {user?.lastname}
                </p>
                <p className="text-sm text-muted-foreground">
                  {authUser?.email}
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
