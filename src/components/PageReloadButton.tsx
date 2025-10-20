import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageReloadButtonProps {
  className?: string;
  excludePaths?: string[];
}

const DEFAULT_EXCLUDED_PATHS = ["/"];

const PageReloadButton = ({
  className,
  excludePaths = DEFAULT_EXCLUDED_PATHS,
}: PageReloadButtonProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const shouldHide = excludePaths.some((path) => path === location.pathname);

  const handleReload = useCallback(() => {
    navigate(0);
  }, [navigate]);

  if (shouldHide) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Reload page"
      onClick={handleReload}
      className={cn(
        "fixed right-4 top-4 z-50 rounded-full border-border/70 bg-background/80 shadow-md backdrop-blur transition-transform hover:scale-105",
        className
      )}
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
};

export default PageReloadButton;
