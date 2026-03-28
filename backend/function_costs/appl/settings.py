import os

class Settings:
    # Azure
    default_scope: str | None
    arm_resource: str
    arm_scope: str
    cost_api_version: str

    # Cache
    cache_ttl_seconds: int
    cache_prefix: str
    redis_url: str | None

    def __init__(self):
        self.default_scope = os.getenv("COSTS_DEFAULT_SCOPE")
        self.arm_resource = os.getenv("COSTS_ARM_RESOURCE", "https://management.azure.com")
        self.arm_scope = os.getenv("COSTS_ARM_SCOPE", "https://management.azure.com/.default")
        self.cost_api_version = os.getenv("COSTS_API_VERSION", "2023-03-01")
        self.cache_ttl_seconds = int(os.getenv("COSTS_CACHE_TTL_SECONDS", "900"))
        self.cache_prefix = os.getenv("COSTS_CACHE_PREFIX", "costapi:")
        self.redis_url = os.getenv("REDIS_URL")

settings = Settings()
