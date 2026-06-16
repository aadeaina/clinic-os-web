from .base import Tool, ToolContext


class AssessUrgency(Tool):
    name = "assess_urgency"
    description = "Classify urgency level. Does NOT diagnose."
    input_schema = {"type": "object", "properties": {}}

    def run(self, args, ctx: ToolContext) -> dict:
        return {"urgency": "non_urgent", "recommend": "nurse_line_or_visit"}


class RouteToNurse(Tool):
    name = "route_to_nurse"
    description = "Hand the patient to the nurse line."
    input_schema = {"type": "object", "properties": {}}

    def run(self, args, ctx: ToolContext) -> dict:
        return {"routed": "nurse_line"}


TRIAGE_TOOLS = [AssessUrgency(), RouteToNurse()]
