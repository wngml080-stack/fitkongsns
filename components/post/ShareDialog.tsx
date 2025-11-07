"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import { shareViaWebAPI, copyToClipboard } from "@/lib/utils/share";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  text?: string;
}

export default function ShareDialog({
  open,
  onOpenChange,
  url,
  title,
  text,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleWebShare = async () => {
    if (typeof window === "undefined" || !navigator.share) {
      alert("이 브라우저는 공유 기능을 지원하지 않습니다.");
      return;
    }

    setIsSharing(true);
    try {
      const success = await shareViaWebAPI(url, title, text);
      if (success) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      alert("링크 복사에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>공유하기</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {canShare && (
            <Button
              onClick={handleWebShare}
              disabled={isSharing}
              className="w-full justify-start gap-3 h-auto py-3"
              variant="outline"
            >
              <Share2 className="w-5 h-5" />
              <div className="flex-1 text-left">
                <div className="font-semibold">다른 앱으로 공유</div>
                <div className="text-xs text-muted-foreground">
                  카카오톡, 메시지 등으로 공유
                </div>
              </div>
            </Button>
          )}

          <Button
            onClick={handleCopyLink}
            className="w-full justify-start gap-3 h-auto py-3"
            variant="outline"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
            <div className="flex-1 text-left">
              <div className="font-semibold">
                {copied ? "복사됨!" : "링크 복사"}
              </div>
              <div className="text-xs text-muted-foreground">
                클립보드에 링크 복사
              </div>
            </div>
          </Button>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">공유 링크</div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1 text-sm truncate">{url}</div>
              <button
                onClick={handleCopyLink}
                className="p-1 hover:bg-background rounded transition-colors"
                aria-label="링크 복사"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
