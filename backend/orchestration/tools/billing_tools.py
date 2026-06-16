from .base import Tool, ToolContext


class LookupCoverage(Tool):
    name = "lookup_coverage"
    description = "Look up the patient's insurance coverage."
    input_schema = {"type": "object", "properties": {}}

    def run(self, args, ctx: ToolContext) -> dict:
        c = ctx.ehr.get_coverage(ctx.patient_ref)
        return {"plan": c.plan, "copay": c.copay, "in_network": c.in_network}


class GetBalance(Tool):
    name = "get_balance"
    description = "Get the patient's outstanding balance."
    input_schema = {"type": "object", "properties": {}}

    def run(self, args, ctx: ToolContext) -> dict:
        return {"balance": "$0.00"}


BILLING_TOOLS = [LookupCoverage(), GetBalance()]
