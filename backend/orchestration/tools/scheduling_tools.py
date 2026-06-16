from .base import Tool, ToolContext


class CheckAvailability(Tool):
    name = "check_availability"
    description = "List open appointment slots for a date range."
    input_schema = {"type": "object", "properties": {"date_range": {"type": "string"}}}

    def run(self, args, ctx: ToolContext) -> dict:
        slots = ctx.ehr.get_slots(ctx.clinic_id, args.get("date_range", "next_7_days"))
        return {"slots": [s.to_dict() for s in slots]}


class BookAppointment(Tool):
    name = "book_appointment"
    description = "Book a specific slot for the patient."
    input_schema = {"type": "object", "properties": {"slot_id": {"type": "string"}},
                    "required": ["slot_id"]}
    writes = True
    requires_confirmation = True

    def preview(self, args, ctx: ToolContext) -> str:
        slot = ctx.ehr.get_slot(args.get("slot_id", ""))
        if slot:
            return f"Book {slot.label} with {slot.provider}"
        return "Book the selected appointment"

    def run(self, args, ctx: ToolContext) -> dict:
        appt = ctx.ehr.create_appointment(args["slot_id"], ctx.patient_ref)
        return {"appointment": appt.to_dict()}


SCHEDULING_TOOLS = [CheckAvailability(), BookAppointment()]
