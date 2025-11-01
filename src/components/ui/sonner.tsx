"use client";

import { cn } from "@/lib/utils";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

interface CustomToasterProps extends ToasterProps {
  variant?: "default" | "glass" | "bordered";
}

const Toaster = ({ variant = "default", ...props }: CustomToasterProps) => {
  const { theme = "system" } = useTheme();

  const variantClasses: Record<string, string> = {
    default:
      "bg-popover text-popover-foreground border border-border rounded-[var(--radius)]",
    glass:
      "backdrop-blur-md bg-white/10 text-foreground border border-white/20 rounded-xl",
    bordered: "bg-transparent text-foreground border border-border rounded-lg",
  };

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={cn("toaster group", variantClasses[variant])}
      icons={{
        success: <CircleCheckIcon className="size-4 text-green-500" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
        error: <OctagonXIcon className="size-4 text-red-500" />,
        loading: (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
