"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

const variantIcon = {
  success: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />,
  destructive: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
  warning: (
    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
  ),
  info: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
  default: null,
} as const;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => {
        const icon =
          variantIcon[(props.variant as keyof typeof variantIcon) ?? "default"];

        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {icon}
              <div className="grid gap-0.5 min-w-0">
                {title && (
                  <ToastTitle className="leading-snug">{title}</ToastTitle>
                )}
                {description && (
                  <ToastDescription className="leading-snug line-clamp-2">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
