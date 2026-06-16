import type { SessionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function minsAgo(m: number) {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

const BASE_SESSIONS: Omit<SessionRow, "created">[] = [
  { id: "a1b2c3d4-e5f6-0001-0000-000000000001", channel: "web",   status: "contained", contained: true,  intent: "scheduling" },
  { id: "b2c3d4e5-f6a7-0002-0000-000000000002", channel: "phone", status: "contained", contained: true,  intent: "billing"    },
  { id: "c3d4e5f6-a7b8-0003-0000-000000000003", channel: "sms",   status: "escalated", contained: false, intent: "triage"     },
  { id: "d4e5f6a7-b8c9-0004-0000-000000000004", channel: "web",   status: "contained", contained: true,  intent: "intake"     },
  { id: "e5f6a7b8-c9d0-0005-0000-000000000005", channel: "web",   status: "contained", contained: true,  intent: "scheduling" },
  { id: "f6a7b8c9-d0e1-0006-0000-000000000006", channel: "phone", status: "escalated", contained: false, intent: "triage"     },
  { id: "a7b8c9d0-e1f2-0007-0000-000000000007", channel: "web",   status: "contained", contained: true,  intent: "billing"    },
  { id: "b8c9d0e1-f2a3-0008-0000-000000000008", channel: "sms",   status: "contained", contained: true,  intent: "smalltalk"  },
  { id: "c9d0e1f2-a3b4-0009-0000-000000000009", channel: "web",   status: "contained", contained: true,  intent: "scheduling" },
  { id: "d0e1f2a3-b4c5-0010-0000-000000000010", channel: "phone", status: "contained", contained: true,  intent: "intake"     },
  { id: "e1f2a3b4-c5d6-0011-0000-000000000011", channel: "web",   status: "contained", contained: true,  intent: "billing"    },
  { id: "f2a3b4c5-d6e7-0012-0000-000000000012", channel: "sms",   status: "escalated", contained: false, intent: "triage"     },
  { id: "a3b4c5d6-e7f8-0013-0000-000000000013", channel: "web",   status: "contained", contained: true,  intent: "scheduling" },
  { id: "b4c5d6e7-f8a9-0014-0000-000000000014", channel: "phone", status: "contained", contained: true,  intent: "intake"     },
  { id: "c5d6e7f8-a9b0-0015-0000-000000000015", channel: "web",   status: "contained", contained: true,  intent: "billing"    },
  { id: "d6e7f8a9-b0c1-0016-0000-000000000016", channel: "web",   status: "contained", contained: true,  intent: "scheduling" },
  { id: "e7f8a9b0-c1d2-0017-0000-000000000017", channel: "sms",   status: "contained", contained: true,  intent: "billing"    },
  { id: "f8a9b0c1-d2e3-0018-0000-000000000018", channel: "web",   status: "active",    contained: null,  intent: "scheduling" },
];

const OFFSETS_MINS = [248, 230, 217, 201, 185, 172, 159, 144, 127, 111, 96, 80, 64, 49, 33, 17, 8, 2];

export async function GET() {
  const sessions: SessionRow[] = BASE_SESSIONS.map((s, i) => ({
    ...s,
    created: minsAgo(OFFSETS_MINS[i]),
  }));
  return Response.json([...sessions].reverse());
}
