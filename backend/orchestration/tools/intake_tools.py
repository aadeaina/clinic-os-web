from .base import Tool, ToolContext


class StartIntake(Tool):
    name = "start_intake"
    description = "Begin a structured intake record for the patient."
    input_schema = {"type": "object", "properties": {}}
    writes = True

    def run(self, args, ctx: ToolContext) -> dict:
        intake_id = ctx.ehr.start_intake(ctx.patient_ref)
        return {"intake_id": intake_id, "status": "started"}


class SaveIntakeField(Tool):
    name = "save_intake_field"
    description = "Save one structured intake field."
    input_schema = {"type": "object",
                    "properties": {"field": {"type": "string"}, "value": {"type": "string"}},
                    "required": ["field", "value"]}
    writes = True
    requires_confirmation = True

    def preview(self, args, ctx: ToolContext) -> str:
        return f"Save {args.get('field', 'field')} = {args.get('value', '')}"

    def run(self, args, ctx: ToolContext) -> dict:
        return {"saved": {args["field"]: args["value"]}}


INTAKE_TOOLS = [StartIntake(), SaveIntakeField()]
