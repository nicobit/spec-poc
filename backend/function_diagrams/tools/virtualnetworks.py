from azure.core.credentials import TokenCredential
from azure.mgmt.network import NetworkManagementClient
from azure.core.credentials import AccessToken
import json
import logging

logger = logging.getLogger(__name__)

class VirtualNetworkManager:
    def __init__(self, token: str, subscription_id: str):
        self.token = token
        self.subscription_id = subscription_id
        self.credential = self.UserTokenCredential(self.token)
        self.network_client = NetworkManagementClient(self.credential, self.subscription_id)

    class UserTokenCredential(TokenCredential):
        def __init__(self, raw_token: str):
            self._token = raw_token

        def get_token(self, *scopes, **kwargs):
            return AccessToken(self._token, float("inf"))

    def get_virtual_networks(self):
        try:
            virtual_networks = list(self.network_client.virtual_networks.list_all())

            nodes = []
            edges = []
            x_pos = 100
            y_base = 100
            y_step = 50

            for vnet_index, vnet in enumerate(virtual_networks):
                y_pos = y_base + vnet_index * y_step
                vnet_id = f"vnet-{vnet.id.replace('/', '_')}"
                nodes.append({
                    "id": vnet_id,
                    "type": "custom",
                    "data": {
                        "label": f"VNet: {vnet.name}",
                        "ip": vnet.address_space.address_prefixes
                    },
                    "position": {"x": x_pos, "y": y_pos}
                })

                # Add edges for peering connections
                for peering in vnet.virtual_network_peerings:
                    peer_vnet_id = f"vnet-{peering.remote_virtual_network.id.replace('/', '_')}"
                    edges.append({
                        "id": f"e-{vnet_id}-{peer_vnet_id}",
                        "source": vnet_id,
                        "target": peer_vnet_id
                    })

            return {"nodes": nodes, "edges": edges}

        except Exception as e:
            logger.error(f"Error retrieving virtual networks: {str(e)}")
            raise RuntimeError("Unexpected error occurred") from e
