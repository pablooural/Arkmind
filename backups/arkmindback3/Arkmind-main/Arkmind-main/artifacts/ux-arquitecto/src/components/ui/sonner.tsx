import { useTheme } from "next-themes";
import * as SonnerLib from "sonner";

const Toaster = ({ ...props }: any) => {
  const { theme = "system" } = useTheme();
  const Comp: any = (SonnerLib as any).Toaster ?? (SonnerLib as any).default ?? SonnerLib;

  return (
    <Comp
      theme={theme as any}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
