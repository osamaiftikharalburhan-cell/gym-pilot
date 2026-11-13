import { ReceiptProvider } from "@/components/receipt-dialog";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }) {
  return (
    <ReceiptProvider>
      <Sidebar />
      <main className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-10 lg:pt-10 print:m-0 print:p-0">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </ReceiptProvider>
  );
}
