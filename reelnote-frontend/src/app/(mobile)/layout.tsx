export default function MobileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto max-w-screen-sm px-3">{children}</div>;
}


