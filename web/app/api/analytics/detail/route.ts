export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    daily_volume: [
      { date: "Jun 9",  sessions: 18, contained: 15, escalated: 2 },
      { date: "Jun 10", sessions: 22, contained: 18, escalated: 2 },
      { date: "Jun 11", sessions: 15, contained: 12, escalated: 2 },
      { date: "Jun 12", sessions: 26, contained: 22, escalated: 2 },
      { date: "Jun 13", sessions: 19, contained: 16, escalated: 2 },
      { date: "Jun 14", sessions: 28, contained: 23, escalated: 3 },
      { date: "Jun 15", sessions: 14, contained: 12, escalated: 1 },
    ],
    hourly: [
      { hour: "6a",  sessions: 2  },
      { hour: "7a",  sessions: 5  },
      { hour: "8a",  sessions: 9  },
      { hour: "9a",  sessions: 15 },
      { hour: "10a", sessions: 19 },
      { hour: "11a", sessions: 17 },
      { hour: "12p", sessions: 13 },
      { hour: "1p",  sessions: 16 },
      { hour: "2p",  sessions: 18 },
      { hour: "3p",  sessions: 14 },
      { hour: "4p",  sessions: 10 },
      { hour: "5p",  sessions: 6  },
      { hour: "6p",  sessions: 3  },
    ],
    weekly: [
      { day: "Mon", sessions: 26 },
      { day: "Tue", sessions: 31 },
      { day: "Wed", sessions: 22 },
      { day: "Thu", sessions: 28 },
      { day: "Fri", sessions: 19 },
      { day: "Sat", sessions: 8  },
      { day: "Sun", sessions: 5  },
    ],
    response_times: [
      { bucket: "<1s",  count: 28 },
      { bucket: "1–2s", count: 61 },
      { bucket: "2–3s", count: 34 },
      { bucket: "3–5s", count: 16 },
      { bucket: ">5s",  count: 8  },
    ],
    channel_mix: [
      { channel: "Web",   count: 72 },
      { channel: "Phone", count: 48 },
      { channel: "SMS",   count: 27 },
    ],
    containment_trend: [
      { date: "Jun 9",  rate: 0.83, escalation_rate: 0.11 },
      { date: "Jun 10", rate: 0.82, escalation_rate: 0.09 },
      { date: "Jun 11", rate: 0.80, escalation_rate: 0.13 },
      { date: "Jun 12", rate: 0.85, escalation_rate: 0.08 },
      { date: "Jun 13", rate: 0.84, escalation_rate: 0.10 },
      { date: "Jun 14", rate: 0.82, escalation_rate: 0.11 },
      { date: "Jun 15", rate: 0.86, escalation_rate: 0.07 },
    ],
  });
}
