import { Protected } from "@/components/layout/protected";
import { TopBar } from "@/components/layout/top-bar";

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </Protected>
  );
}
