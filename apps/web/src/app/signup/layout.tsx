import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — AI QA Agent",
  description: "Create your AI QA Agent account and start auditing your projects.",
  openGraph: {
    title: "Sign up — AI QA Agent",
    description: "Create your AI QA Agent account and start auditing your projects.",
  },
};

export default function SignupLayout({ children }: LayoutProps<"/signup">) {
  return children;
}
