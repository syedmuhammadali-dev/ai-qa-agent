"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  className,
  size = "icon-sm",
}: {
  value: string;
  className?: string;
  size?: "icon" | "icon-sm" | "icon-xs";
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error("Copy failed — copy it manually"),
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy"}
      className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="sr-only">{copied ? "Copied!" : "Copy"}</span>
    </Button>
  );
}
