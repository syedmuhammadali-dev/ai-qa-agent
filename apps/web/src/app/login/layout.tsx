import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in — AI QA Agent",
  description: "Log in to your AI QA Agent dashboard.",
  openGraph: {
    title: "Log in — AI QA Agent",
    description: "Log in to your AI QA Agent dashboard.",
  },
};

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children;
}
