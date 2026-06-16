"""Maps each agent to its scoped tool set, and tools by name for execution."""
from .scheduling_tools import SCHEDULING_TOOLS
from .intake_tools import INTAKE_TOOLS
from .triage_tools import TRIAGE_TOOLS
from .billing_tools import BILLING_TOOLS

AGENT_TOOLS = {
    "scheduling": SCHEDULING_TOOLS,
    "intake": INTAKE_TOOLS,
    "triage": TRIAGE_TOOLS,
    "billing": BILLING_TOOLS,
    "smalltalk": [],
}


def tools_for(agent_key: str):
    return AGENT_TOOLS.get(agent_key, [])


def tool_by_name(agent_key: str, name: str):
    return next((t for t in tools_for(agent_key) if t.name == name), None)
