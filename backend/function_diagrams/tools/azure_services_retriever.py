from azure.core.credentials  import TokenCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.core.credentials import AccessToken
import json
import logging

logger = logging.getLogger(__name__)

class AzureServicesRetriever:
    def __init__(self, token: str, subscription_id: str):
        self.token = token
        self.subscription_id = subscription_id
        self.credential = self.UserTokenCredential(self.token)
        self.resource_client = ResourceManagementClient(self.credential, self.subscription_id)

    class UserTokenCredential(TokenCredential):
        def __init__(self, raw_token: str):
            self._token = raw_token

        def get_token(self, *scopes, **kwargs):
            return AccessToken(self._token, float("inf"))

    def get_diagram(self, resource_type: str = None):
        try:
            logger.warning(f"Retrieving resources for subscriptionId: {self.subscription_id}")
            resources = list(self.resource_client.resources.list())

            nodes = []
            edges = []
            group_map = {}
            y_base = 100
            y_step = 100
            x_group = 100
            x_resource = 400

            for index, res in enumerate(resources):
                if resource_type and res.type != resource_type:
                    continue

                rg_name = res.id.split("/")[4]
                rg = res.id.replace("/", "_")
                rg_id = f"rg-{rg}"
                res_id = f"{rg}-{res.name}"

                if rg_id not in group_map:
                    y_pos = len(group_map) * y_step
                    nodes.append({
                        "id": rg_id,
                        "type": "custom",
                        "data": {"label": f"Resource Group: {res.name}", "type": f"{res.type}"},
                        "position": {"x": x_group, "y": y_pos}
                    })
                    group_map[rg_id] = y_pos

                y_pos = group_map[rg_id] + index * 15
                nodes.append({
                    "id": res_id,
                    "type": "custom",
                    "data": {"label": f"{res.name}\n({res.type.split('/')[-1]})"},
                    "position": {"x": x_resource, "y": y_pos}
                })
                edges.append({
                    "id": f"e-{rg}-{res.name}",
                    "source": rg_id,
                    "target": res_id
                })

            return {"nodes": nodes, "edges": edges}

        except Exception as e:
            logger.error(f"Error retrieving resources: {str(e)}")
            raise RuntimeError("Unexpected error occurred") from e
