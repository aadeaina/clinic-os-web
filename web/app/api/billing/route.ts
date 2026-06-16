export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    total_billed_mtd:  284750,
    collected_mtd:     198320,
    outstanding:        86430,
    pending_claims:        34,
    collection_rate:     0.697,
    claims: [
      { id: "CLM-8832", patient: "J. Morrison",   insurance: "BlueCross PPO",  amount: 1240, status: "paid",       service: "Office visit + labs",      date: "2026-06-15" },
      { id: "CLM-8831", patient: "A. Patel",      insurance: "Aetna",          amount:  850, status: "pending",    service: "Cardiology consult",        date: "2026-06-15" },
      { id: "CLM-8830", patient: "S. Kim",        insurance: "UnitedHealth",   amount: 2100, status: "denied",     service: "MRI — lower back",          date: "2026-06-14" },
      { id: "CLM-8829", patient: "R. Thompson",   insurance: "Cigna",          amount:  675, status: "paid",       service: "Urgent care visit",         date: "2026-06-14" },
      { id: "CLM-8828", patient: "M. Garcia",     insurance: "Medicare",       amount:  430, status: "processing", service: "Annual wellness exam",       date: "2026-06-13" },
      { id: "CLM-8827", patient: "T. Williams",   insurance: "BlueCross PPO",  amount: 1890, status: "paid",       service: "Orthopedic surgery follow-up",date: "2026-06-13" },
      { id: "CLM-8826", patient: "L. Chen",       insurance: "Medicaid",       amount:  310, status: "pending",    service: "Pediatric well-child visit", date: "2026-06-12" },
      { id: "CLM-8825", patient: "B. Nguyen",     insurance: "Aetna",          amount:  980, status: "paid",       service: "Dermatology consult",        date: "2026-06-12" },
      { id: "CLM-8824", patient: "C. Osei",       insurance: "Self-pay",       amount: 2450, status: "pending",    service: "Colonoscopy",               date: "2026-06-11" },
      { id: "CLM-8823", patient: "F. Rivera",     insurance: "UnitedHealth",   amount:  760, status: "processing", service: "Physical therapy (6 sessions)",date:"2026-06-11" },
      { id: "CLM-8822", patient: "D. Johnson",    insurance: "Cigna",          amount:  540, status: "denied",     service: "Allergy testing panel",      date: "2026-06-10" },
      { id: "CLM-8821", patient: "K. Brown",      insurance: "BlueCross PPO",  amount: 1120, status: "paid",       service: "Neurological evaluation",    date: "2026-06-10" },
    ],
    by_insurance: [
      { insurer: "BlueCross PPO", amount: 89400 },
      { insurer: "Aetna",         amount: 52300 },
      { insurer: "UnitedHealth",  amount: 47800 },
      { insurer: "Cigna",         amount: 38900 },
      { insurer: "Medicare",      amount: 32100 },
      { insurer: "Medicaid",      amount: 14200 },
      { insurer: "Self-pay",      amount: 10050 },
    ],
    revenue_by_dept: [
      { dept: "Primary Care",  revenue: 89400 },
      { dept: "Cardiology",    revenue: 67300 },
      { dept: "Orthopedics",   revenue: 52100 },
      { dept: "Neurology",     revenue: 38900 },
      { dept: "Pediatrics",    revenue: 22100 },
      { dept: "Labs",          revenue: 14950 },
    ],
    monthly_trend: [
      { month: "Jan", billed: 210400, collected: 152800 },
      { month: "Feb", billed: 198300, collected: 141200 },
      { month: "Mar", billed: 234100, collected: 171000 },
      { month: "Apr", billed: 251700, collected: 182400 },
      { month: "May", billed: 268900, collected: 190100 },
      { month: "Jun", billed: 284750, collected: 198320 },
    ],
  });
}
