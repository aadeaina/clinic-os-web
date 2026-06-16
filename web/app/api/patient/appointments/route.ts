export const dynamic = "force-dynamic";

export async function GET() {
  const upcoming = [
    {
      id: "apt-1",
      date: "June 24, 2026",
      time: "10:30 AM",
      doctor: "Dr. Sarah Chen",
      specialty: "Primary Care",
      type: "Annual physical exam",
      location: "Riverside Medical — Main Campus, Suite 210",
      status: "upcoming" as const,
      notes: "Please fast for 12 hours before your appointment. Bring your insurance card and a list of current medications.",
    },
    {
      id: "apt-2",
      date: "July 8, 2026",
      time: "2:15 PM",
      doctor: "Dr. David Kim",
      specialty: "Cardiology",
      type: "Cardiology follow-up",
      location: "Riverside Medical — Heart Center, Floor 4",
      status: "upcoming" as const,
    },
  ];

  const past = [
    { id: "apt-3", date: "May 12, 2026", time: "9:00 AM", doctor: "Dr. Sarah Chen", specialty: "Primary Care",   type: "Sick visit",                location: "Main Campus",    status: "completed" as const },
    { id: "apt-4", date: "Apr 3, 2026",  time: "11:00 AM",doctor: "Dr. Lisa Park",  specialty: "Dermatology",   type: "Skin check",                location: "Dermatology Clinic", status: "completed" as const },
    { id: "apt-5", date: "Mar 18, 2026", time: "3:30 PM", doctor: "Dr. Sarah Chen", specialty: "Primary Care",   type: "Lab results review",        location: "Main Campus",    status: "completed" as const },
    { id: "apt-6", date: "Feb 7, 2026",  time: "10:00 AM",doctor: "Dr. Sarah Chen", specialty: "Primary Care",   type: "Blood pressure follow-up",  location: "Main Campus",    status: "completed" as const },
    { id: "apt-7", date: "Jan 15, 2026", time: "9:45 AM", doctor: "Dr. Mark Ruiz",  specialty: "Orthopedics",   type: "Knee pain evaluation",      location: "Sports Medicine",status: "cancelled" as const },
  ];

  const summary = {
    name: "John",
    next_appointment: upcoming[0]
      ? { date: upcoming[0].date, time: upcoming[0].time, doctor: upcoming[0].doctor, type: upcoming[0].type, location: upcoming[0].location }
      : null,
    unread_results:    2,
    outstanding_balance: 340,
    unread_messages:   0,
  };

  return Response.json({ summary, appointments: [...upcoming, ...past] });
}
