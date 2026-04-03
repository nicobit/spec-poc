from __future__ import annotations

import os


def build_execution_credential(preferred_tenant: str | None = None):
    from azure.identity import DefaultAzureCredential, ManagedIdentityCredential

    use_vscode_credential = os.getenv("VSCODE", "").strip().lower() == "true"
    use_default_credential = use_vscode_credential or (
        os.getenv("AZURE_EXECUTION_USE_DEFAULT_CREDENTIAL", "").strip().lower() == "true"
    )
    if use_default_credential:
        # In local dev, only include EnvironmentCredential when the service principal
        # configuration is complete. This avoids noisy partial-env failures when we
        # intend to use VS Code or Azure CLI auth instead.
        has_complete_env_credential = all(
            os.getenv(name) for name in ("AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET")
        )
        credential_kwargs = dict(
            exclude_environment_credential=not has_complete_env_credential,
            exclude_managed_identity_credential=True,
            exclude_shared_token_cache_credential=True,
            exclude_visual_studio_code_credential=not use_vscode_credential,
        )
        if preferred_tenant:
            credential_kwargs.update(
                additionally_allowed_tenants=[preferred_tenant],
                interactive_browser_tenant_id=preferred_tenant,
                shared_cache_tenant_id=preferred_tenant,
                visual_studio_code_tenant_id=preferred_tenant,
            )
        return DefaultAzureCredential(**credential_kwargs)

    client_id = os.getenv("AZURE_CLIENT_ID")
    if client_id:
        return ManagedIdentityCredential(client_id=client_id)
    return ManagedIdentityCredential()
