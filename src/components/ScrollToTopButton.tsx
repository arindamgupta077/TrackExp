import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_TRIGGER = 200;

export const ScrollToTopButton = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  const handleScroll = useCallback(() => {
    setIsEnabled(window.scrollY > SCROLL_TRIGGER);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  const scrollToTop = useCallback(() => {
    if (!isEnabled) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isEnabled]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="default"
      aria-label="Scroll to top"
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-300",
        "opacity-100 translate-y-0"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};
