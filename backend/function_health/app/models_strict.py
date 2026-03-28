from typing import Optional, Literal, Union, List
from pydantic import BaseModel, Field
from typing_extensions import Annotated

# -------------------- Field sources --------------------
class InlineSource(BaseModel):
    source: Literal["inline"]
    value: object

class SettingsSource(BaseModel):
    source: Literal["settings"]
    setting_name: str

class KvRef(BaseModel):
    vault_uri: str
    secret_name: str

class KvSource(BaseModel):
    source: Literal["kv"]
    key_vault: KvRef

FieldSource = Union[InlineSource, SettingsSource, KvSource]

# -------------------- Per-service config shapes --------------------
class SqlDbCfg(BaseModel):
    conn_str: FieldSource

class KeyVaultCfg(BaseModel):
    vault_uri: FieldSource
    test_secret_name: Optional[FieldSource] = None

class StorageBlobCfg(BaseModel):
    # either connection_string OR endpoint (+ MI)
    connection_string: Optional[FieldSource] = None
    endpoint: Optional[FieldSource] = None
    container: Optional[FieldSource] = None

class StorageTableCfg(BaseModel):
    connection_string: Optional[FieldSource] = None
    endpoint: Optional[FieldSource] = None
    table_name: Optional[FieldSource] = None

class AzureOpenAICfg(BaseModel):
    endpoint: FieldSource
    api_version: Optional[FieldSource] = None
    live_call: Optional[FieldSource] = None
    deployment: Optional[FieldSource] = None

class AISearchCfg(BaseModel):
    endpoint: FieldSource
    index_name: FieldSource

class SBEntityQueue(BaseModel):
    type: Literal["queue"]
    queue_name: FieldSource

class SBEntitySub(BaseModel):
    type: Literal["subscription"]
    topic_name: FieldSource
    subscription_name: FieldSource

SBEntity = Union[SBEntityQueue, SBEntitySub]

class ServiceBusCfg(BaseModel):
    namespace: FieldSource
    entity: SBEntity

# -------------------- Service discriminated union --------------------
class ServiceBase(BaseModel):
    name: str
    enabled: bool = True

class SvcSql(ServiceBase):
    type: Literal["sql_db"]
    config: SqlDbCfg

class SvcKeyVault(ServiceBase):
    type: Literal["key_vault"]
    config: KeyVaultCfg

class SvcBlob(ServiceBase):
    type: Literal["storage_blob"]
    config: StorageBlobCfg

class SvcTable(ServiceBase):
    type: Literal["storage_table"]
    config: StorageTableCfg

class SvcAOAI(ServiceBase):
    type: Literal["azure_openai"]
    config: AzureOpenAICfg

class SvcSearch(ServiceBase):
    type: Literal["ai_search"]
    config: AISearchCfg

class SvcSB(ServiceBase):
    type: Literal["service_bus"]
    config: ServiceBusCfg

AnyService = Annotated[
    Union[SvcSql, SvcKeyVault, SvcBlob, SvcTable, SvcAOAI, SvcSearch, SvcSB],
    Field(discriminator="type"),
]

class ServicesConfigStrict(BaseModel):
    default_timeout_seconds: Optional[float] = None
    services: List[AnyService] = Field(default_factory=list)
