import { headers } from "next/headers";
import PatientNav from "@/components/PatientNav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  let userName: string | undefined;
  try {
    const raw = headers().get("x-auth-user");
    if (raw) userName = JSON.parse(raw).name;
  } catch {}

  return (
    <div className="flex h-full flex-col">
      <PatientNav userName={userName} />
      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
