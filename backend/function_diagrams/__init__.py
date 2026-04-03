
import json
import azure.functions as func
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from shared.utils.nb_logger import NBLogger
from shared.auth.roles import auth_only

from function_diagrams.tools.subscriptions import SubscriptionManager
from function_diagrams.tools.virtualnetwork_retriever import VirtualNetworkRetriever
from function_diagrams.tools.azure_services_retriever import AzureServicesRetriever

fast_app = FastAPI() 
logger = NBLogger().Log()

@fast_app.get("/api/diagrams/") 
async def return_http_no_body(user=Depends(auth_only)): 
    return Response(content="Diagrams is working", media_type="text/plain") 


def get_bearer_token(req: Request) -> str:
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    return auth_header.split(" ", 1)[1].strip()

@fast_app.get("/api/diagrams/subscriptions")
async def getSubscriptions(req: Request, user=Depends(auth_only)):
    token = get_bearer_token(req)
  
    try:
        subscriptionManager = SubscriptionManager(token)
        result  = subscriptionManager.get_subscriptions()

        return Response(content=json.dumps({"nodes": result['nodes'], "edges": result['edges']}), status_code=200)

    except Exception as e:
        logger.error(f"Error retrieving subscriptions: {str(e)}")
        return Response(content="Unexpected error occurred", status_code=500)
    

@fast_app.get("/api/diagrams/virtual-networks-and-subnets")
async def getVirtualNetworksAndSubnets(
    req: Request,
    subscriptionId: str,
    include_subnets: bool = True,
    user=Depends(auth_only),
):
    logger.warning("Received request to get Azure virtual networks and subnets")
    token = get_bearer_token(req)
   
    try:
        result  = VirtualNetworkRetriever(token, subscriptionId).get_virtual_networks_and_subnets(include_subnets=include_subnets)
        return Response(content=json.dumps({"nodes": result["nodes"], "edges": result["edges"]}), status_code=200)

    except Exception as e:
        logger.error(f"Error retrieving virtual networks and subnets: {str(e)}")
        return Response(content="Unexpected error occurred", status_code=500)

@fast_app.get("/api/diagrams/data")
async def getDiagram(
    req: Request,
    subscriptionId: str,
    resourceType: str = None,
    user=Depends(auth_only),
): 
    logger.warning("Received request to get Azure resource architecture")

    token = get_bearer_token(req)

    try:
        result = AzureServicesRetriever(token, subscriptionId).get_diagram(resource_type=resourceType)
        return Response(content=json.dumps({"nodes": result["nodes"], "edges": result["edges"]}), status_code=200)

    except Exception as e:
        logger.error(f"Error retrieving resources: {str(e)}")
        return Response(content="Unexpected error occurred", status_code=500)
    

async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
