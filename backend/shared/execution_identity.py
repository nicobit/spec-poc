from __future__ import annotations

import os


def build_execution_credential():
    from azure.identity import DefaultAzureCredential, ManagedIdentityCredential

    use_default_credential = (
        os.getenv("VSCODE", "").strip().lower() == "true"
        or os.getenv("AZURE_EXECUTION_USE_DEFAULT_CREDENTIAL", "").strip().lower() == "true"
    )
    if use_default_credential:
        return DefaultAzureCredential(
            exclude_managed_identity_credential=True,
            exclude_shared_token_cache_credential=True,
        )

    client_id = os.getenv("AZURE_CLIENT_ID")
    if client_id:
        return ManagedIdentityCredential(client_id=client_id)
    return ManagedIdentityCredential()

