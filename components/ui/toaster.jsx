"use client";

import { useToast } from "@/components/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider data-oid="6nag0-_">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} data-oid="zol:1wq">
            <div className="grid gap-1" data-oid="n7t44hy">
              {title && <ToastTitle data-oid="w2cesq-">{title}</ToastTitle>}
              {description && (
                <ToastDescription data-oid="2i1vku7">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose data-oid="tmjdp2o" />
          </Toast>
        );
      })}
      <ToastViewport data-oid="0ftxtwq" />
    </ToastProvider>
  );
}
