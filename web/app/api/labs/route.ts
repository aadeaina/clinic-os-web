export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    pending_orders:  12,
    urgent:           3,
    results_ready:    8,
    reviewed_today:   6,
    orders: [
      { id: "LAB-4438", patient: "J. Morrison",  test: "Complete Blood Count (CBC)", ordered_by: "Dr. Chen",    ordered: "2026-06-15T09:15:00Z", priority: "routine",  status: "pending"     },
      { id: "LAB-4437", patient: "A. Patel",     test: "Lipid Panel",                ordered_by: "Dr. Osei",    ordered: "2026-06-15T08:42:00Z", priority: "urgent",   status: "in_progress" },
      { id: "LAB-4436", patient: "S. Kim",       test: "HbA1c",                      ordered_by: "Dr. Park",    ordered: "2026-06-15T08:20:00Z", priority: "routine",  status: "in_progress" },
      { id: "LAB-4435", patient: "R. Thompson",  test: "Comprehensive Metabolic",    ordered_by: "Dr. Williams",ordered: "2026-06-15T07:58:00Z", priority: "stat",     status: "pending"     },
      { id: "LAB-4434", patient: "M. Garcia",    test: "Thyroid Panel (TSH, T3, T4)",ordered_by: "Dr. Chen",    ordered: "2026-06-14T16:30:00Z", priority: "routine",  status: "pending"     },
      { id: "LAB-4433", patient: "T. Williams",  test: "BNP (B-natriuretic peptide)",ordered_by: "Dr. Adeyemi",ordered: "2026-06-14T15:12:00Z", priority: "urgent",   status: "in_progress" },
      { id: "LAB-4432", patient: "L. Chen",      test: "Urinalysis",                 ordered_by: "Dr. Park",    ordered: "2026-06-14T14:45:00Z", priority: "routine",  status: "pending"     },
      { id: "LAB-4431", patient: "B. Nguyen",    test: "Vitamin D, 25-OH",           ordered_by: "Dr. Osei",    ordered: "2026-06-14T13:22:00Z", priority: "routine",  status: "pending"     },
      { id: "LAB-4430", patient: "F. Rivera",    test: "Prothrombin Time / INR",     ordered_by: "Dr. Russo",   ordered: "2026-06-14T12:10:00Z", priority: "urgent",   status: "pending"     },
      { id: "LAB-4429", patient: "D. Johnson",   test: "ANA Panel",                  ordered_by: "Dr. Menon",   ordered: "2026-06-14T11:05:00Z", priority: "routine",  status: "pending"     },
      { id: "LAB-4428", patient: "K. Brown",     test: "Iron Studies + Ferritin",    ordered_by: "Dr. Chen",    ordered: "2026-06-14T10:30:00Z", priority: "routine",  status: "in_progress" },
      { id: "LAB-4427", patient: "C. Osei",      test: "Colon cancer screening (FIT)",ordered_by: "Dr. Park",   ordered: "2026-06-14T09:48:00Z", priority: "routine",  status: "pending"     },
    ],
    results: [
      { id: "LAB-4426", patient: "E. Johnson",  test: "HbA1c",                   result: "8.2%",     flag: "high",     reviewed: "2026-06-15T10:30:00Z", reviewed_by: "Dr. Park"    },
      { id: "LAB-4425", patient: "N. Okafor",   test: "CBC",                     result: "WBC 11.2", flag: "high",     reviewed: "2026-06-15T09:55:00Z", reviewed_by: "Dr. Chen"    },
      { id: "LAB-4424", patient: "H. Martinez", test: "Lipid Panel",             result: "LDL 142",  flag: "high",     reviewed: "2026-06-15T09:20:00Z", reviewed_by: "Dr. Osei"    },
      { id: "LAB-4423", patient: "P. Singh",    test: "TSH",                     result: "1.8 mIU/L",flag: "normal",   reviewed: "2026-06-15T08:45:00Z", reviewed_by: "Dr. Park"    },
      { id: "LAB-4422", patient: "Y. Kim",      test: "BNP",                     result: "840 pg/mL",flag: "critical", reviewed: "2026-06-14T17:00:00Z", reviewed_by: "Dr. Adeyemi" },
      { id: "LAB-4421", patient: "G. Roberts",  test: "Creatinine",              result: "1.1 mg/dL",flag: "normal",   reviewed: "2026-06-14T16:15:00Z", reviewed_by: "Dr. Osei"    },
      { id: "LAB-4420", patient: "I. Brown",    test: "INR",                     result: "3.8",      flag: "high",     reviewed: "2026-06-14T15:30:00Z", reviewed_by: "Dr. Russo"   },
      { id: "LAB-4419", patient: "Q. Davis",    test: "Vitamin D",               result: "18 ng/mL", flag: "low",      reviewed: "2026-06-14T14:00:00Z", reviewed_by: "Dr. Chen"    },
    ],
    by_test_type: [
      { test: "CBC",              count: 22 },
      { test: "Comprehensive Met",count: 18 },
      { test: "Lipid Panel",      count: 15 },
      { test: "HbA1c",            count: 12 },
      { test: "Thyroid Panel",    count: 9  },
      { test: "Urinalysis",       count: 8  },
      { test: "BNP",              count: 5  },
      { test: "Coagulation",      count: 4  },
    ],
  });
}
