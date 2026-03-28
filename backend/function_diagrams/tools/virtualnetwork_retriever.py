import json
from azure.core.credentials  import TokenCredential
from azure.mgmt.network import NetworkManagementClient
from azure.core.credentials import AccessToken
import logging

logger = logging.getLogger(__name__)

class VirtualNetworkRetriever:
    def __init__(self, token: str, subscription_id: str):
        self.token = token
        self.subscription_id = subscription_id
        self.credential = self.UserTokenCredential(token)

    class UserTokenCredential(TokenCredential):
        def __init__(self, raw_token: str):
            self._token = raw_token

        def get_token(self, *scopes, **kwargs):
            return AccessToken(self._token, float("inf"))

    def get_virtual_networks_and_subnets(self, include_subnets: bool = True):
        try:
            if not self.subscription_id:
                raise ValueError("Missing subscriptionId parameter")

            network_client = NetworkManagementClient(self.credential, self.subscription_id)
            virtual_networks = list(network_client.virtual_networks.list_all())

            nodes = []
            edges = []
            x_vnet = 100
            x_subnet = 400
            y_base = 100
            y_step = 50

            for vnet_index, vnet in enumerate(virtual_networks):
                y_vnet = y_base + vnet_index * y_step
                vnet_id = f"vnet-{vnet.id.replace('/', '_')}"
                nodes.append({
                    "id": vnet_id,
                    "type": "custom",
                    "data": {
                        "label": f"VNet: {vnet.name}",
                        "ip": vnet.address_space.address_prefixes
                    },
                    "position": {"x": x_vnet, "y": y_vnet}
                })

                if include_subnets:
                    # Add subnets as child nodes
                    for subnet_index, subnet in enumerate(vnet.subnets):
                        y_subnet = y_vnet + subnet_index * 20
                        subnet_id = f"subnet-{subnet.id.replace('/', '_')}"
                        nodes.append({
                            "id": subnet_id,
                            "type": "custom",
                            "data": {"label": f"Subnet: {subnet.name}"},
                            "position": {"x": x_subnet, "y": y_subnet}
                        })
                        edges.append({
                            "id": f"e-{vnet_id}-{subnet_id}",
                            "source": vnet_id,
                            "target": subnet_id
                        })

            return {"nodes": nodes, "edges": edges}

        except Exception as e:
            logger.error(f"Error retrieving virtual networks and subnets: {str(e)}")
            raise RuntimeError("Unexpected error occurred") from e
