from collections.abc import Generator

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage


class EchoTool(Tool):
    def _invoke(self, tool_parameters: dict) -> Generator[ToolInvokeMessage, None, None]:
        text = str(tool_parameters.get("text", ""))
        yield self.create_text_message(f"echo:{text}")
