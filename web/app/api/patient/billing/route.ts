export const dynamic = "force-dynamic";

export async function GET() {
  const invoices = [
    {
      id:            "inv-1",
      date:          "June 12, 2026",
      service:       "Annual physical exam",
      provider:      "Dr. Sarah Chen",
      billed:        350,
      insurance_paid: 0,
      patient_owes:  250,
      status:        "pending" as const,
    },
    {
      id:            "inv-2",
      date:          "June 12, 2026",
      service:       "Lab work — comprehensive metabolic panel",
      provider:      "Riverside Lab",
      billed:        185,
      insurance_paid: 95,
      patient_owes:  90,
      status:        "pending" as const,
    },
    {
      id:            "inv-3",
      date:          "May 12, 2026",
      service:       "Office visit — sick visit",
      provider:      "Dr. Sarah Chen",
      billed:        180,
      insurance_paid: 144,
      patient_owes:  36,
      status:        "overdue" as const,
    },
    {
      id:            "inv-4",
      date:          "Apr 3, 2026",
      service:       "Dermatology skin check",
      provider:      "Dr. Lisa Park",
      billed:        220,
      insurance_paid: 176,
      patient_owes:  44,
      status:        "paid" as const,
    },
    {
      id:            "inv-5",
      date:          "Mar 18, 2026",
      service:       "Office visit — follow up",
      provider:      "Dr. Sarah Chen",
      billed:        120,
      insurance_paid: 96,
      patient_owes:  24,
      status:        "paid" as const,
    },
  ];

  const total_owed = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.patient_owes, 0);

  const total_paid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.patient_owes, 0);

  return Response.json({ invoices, summary: { total_owed, total_paid } });
}
