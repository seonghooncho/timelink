import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      duration={2800}
      visibleToasts={1}
      gap={8}
      mobileOffset={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))", left: "1rem", right: "1rem" }}
      offset={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
      className="toaster group"
      toastOptions={{
        closeButton: true,
        classNames: {
          toast:
            "group toast group-[.toaster]:w-[calc(100vw-2rem)] group-[.toaster]:max-w-sm group-[.toaster]:rounded-xl group-[.toaster]:border-border/80 group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground group-[.toaster]:shadow-fab group-[.toaster]:backdrop-blur group-[.toaster]:px-4 group-[.toaster]:py-3",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold",
          description: "group-[.toast]:mt-0.5 group-[.toast]:text-xs group-[.toast]:leading-relaxed group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-primary/30",
          error: "group-[.toaster]:border-destructive/35",
          info: "group-[.toaster]:border-border",
          actionButton: "group-[.toast]:rounded-lg group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:rounded-lg group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
