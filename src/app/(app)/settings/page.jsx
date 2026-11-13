import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { getBotStatus, getDb } from "@/lib/db";
import { storageKind } from "@/lib/store";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { BotCard } from "./bot-card";
import { SettingsForm } from "./settings-form";
import { UsersPanel } from "./users-panel";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Gym details, fee plans, WhatsApp bot, messages and staff accounts" />
      <Suspense fallback={<PageSkeleton />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const [me, db, bot] = await Promise.all([requireOwner(), getDb(), getBotStatus()]);
  const users = db.users.map(({ id, name, username, role }) => ({ id, name, username, role }));
  return (
    <div className="space-y-6">
      <BotCard status={bot} now={Date.now()} storage={storageKind} />
      <SettingsForm settings={db.settings} plans={db.plans} />
      <UsersPanel users={users} meId={me.id} />
    </div>
  );
}
