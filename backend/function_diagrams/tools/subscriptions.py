import json
from azure.core.credentials  import TokenCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.core.credentials import AccessToken
import logging

logger = logging.getLogger(__name__)

class SubscriptionManager:
    class UserTokenCredential(TokenCredential):
        def __init__(self, raw_token: str):
            self._token = raw_token

        def get_token(self, *scopes, **kwargs):
            return AccessToken(self._token, float("inf"))

    def __init__(self, token: str):
        self.token = token
        self.credential = self.UserTokenCredential(token)

    def get_subscriptions(self):
        logger.warning("Fetching Azure subscriptions")

        try:
            resource_client = ResourceManagementClient(self.credential, "")
            subscriptions = list(resource_client.subscriptions.list())

            nodes = []
            edges = []
            x_pos = 100
            y_base = 100
            y_step = 100

            for index, sub in enumerate(subscriptions):
                y_pos = y_base + index * y_step
                nodes.append({
                    "id": sub.subscription_id,
                    "type": "custom",
                    "data": {"label": f"Subscription: {sub.display_name}"},
                    "position": {"x": x_pos, "y": y_pos}
                })

            return {"nodes": nodes, "edges": edges}

        except Exception as e:
            logger.error(f"Error retrieving subscriptions: {str(e)}")
            raise RuntimeError("Unexpected error occurred") from e
