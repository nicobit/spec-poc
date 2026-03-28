from openai import AzureOpenAI

from app.services.secret_service import SecretService
from app.settings import (
    COMPLETION_MODEL,
    EMBEDDING_MODEL,
    KEY_VAULT_CORE_URI,
    OPENAI_ENDPOINT_SECRET_NAME,
    OPENAI_KEY_SECRET_NAME,
    OPENAI_VERSION_SECRET_NAME,
)
from app.utils.nb_logger import NBLogger


class OpenAIService:
    logger = NBLogger().Log()
    _client = None

    @classmethod
    def _build_client(cls):
        openai_key = SecretService.get_secret_value(KEY_VAULT_CORE_URI, OPENAI_KEY_SECRET_NAME)
        openai_endpoint = SecretService.get_secret_value(KEY_VAULT_CORE_URI, OPENAI_ENDPOINT_SECRET_NAME)
        openai_version = SecretService.get_secret_value(KEY_VAULT_CORE_URI, OPENAI_VERSION_SECRET_NAME)
        return AzureOpenAI(
            api_key=openai_key,
            azure_endpoint=openai_endpoint,
            api_version=openai_version,
        )

    @classmethod
    def client(cls):
        if cls._client is None:
            cls._client = cls._build_client()
        return cls._client

    @classmethod
    def get_embedding(cls, text: str, model=EMBEDDING_MODEL) -> list:
        """Get the embedding vector for the given text using OpenAI."""
        response = cls.client().embeddings.create(input=text, model=model)
        embedding = response.data[0].embedding
        return embedding

    @classmethod
    def chat(cls, messages: str, model=COMPLETION_MODEL, max_tokens=150, temperature=0) -> str:
        """Generate a response using GPT-4 from the given prompt."""
        response = cls.client().chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        retval = response.choices[0].message.content.strip()
        return retval
