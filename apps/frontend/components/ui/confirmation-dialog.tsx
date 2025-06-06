
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  icon?: React.ElementType;
}

export function ConfirmationDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
  icon: Icon = AlertTriangle,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {Icon && <Icon className={cn("h-6 w-6", isDestructive ? "text-destructive" : "text-primary")} />}
            <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
          </div>
          {typeof description === 'string' ? (
            <DialogDescription className="mt-2 text-sm text-muted-foreground pl-8">
              {description}
            </DialogDescription>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground pl-8">{description}</div>
          )}
        </DialogHeader>
        <DialogFooter className="mt-6 gap-2 sm:gap-3 flex-col-reverse sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto">
              {cancelText}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
            className={cn("w-full sm:w-auto", isDestructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "")}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
