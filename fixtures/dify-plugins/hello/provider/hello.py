from dify_plugin import ToolProvider


class HelloProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict) -> None:
        return None
