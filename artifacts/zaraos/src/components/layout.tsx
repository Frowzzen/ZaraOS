interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-full overflow-y-auto text-foreground font-sans">
      {children}
    </div>
  );
}
