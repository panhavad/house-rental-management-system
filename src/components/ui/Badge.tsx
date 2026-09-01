type Tone = "green" | "amber" | "red" | "slate" | "blue";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

const ROOM_STATUS_TONE: Record<string, Tone> = {
  VACANT: "blue",
  OCCUPIED: "green",
  MAINTENANCE: "amber",
};

const CONTRACT_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "green",
  ENDED: "slate",
  TERMINATED: "red",
};

const PAYMENT_STATUS_TONE: Record<string, Tone> = {
  PENDING: "amber",
  PAID: "green",
  OVERDUE: "red",
};

export function RoomStatusBadge({ status }: { status: string }) {
  return <Badge tone={ROOM_STATUS_TONE[status] ?? "slate"}>{status}</Badge>;
}

export function ContractStatusBadge({ status }: { status: string }) {
  return <Badge tone={CONTRACT_STATUS_TONE[status] ?? "slate"}>{status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge tone={PAYMENT_STATUS_TONE[status] ?? "slate"}>{status}</Badge>;
}
