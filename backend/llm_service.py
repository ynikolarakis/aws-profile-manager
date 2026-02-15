"""LLM provider abstraction with streaming support.

Supports Bedrock, Anthropic, OpenAI, Google AI, OpenRouter, and Ollama.
Each provider implements generate() yielding text chunks.
"""

import json
from abc import ABC, abstractmethod
from typing import Generator

import httpx

# Region name mappings for natural language translation
REGION_ALIASES = {
    "frankfurt": "eu-central-1",
    "ireland": "eu-west-1",
    "london": "eu-west-2",
    "paris": "eu-west-3",
    "stockholm": "eu-north-1",
    "milan": "eu-south-1",
    "virginia": "us-east-1",
    "ohio": "us-east-2",
    "california": "us-west-1",
    "oregon": "us-west-2",
    "tokyo": "ap-northeast-1",
    "seoul": "ap-northeast-2",
    "osaka": "ap-northeast-3",
    "singapore": "ap-southeast-1",
    "sydney": "ap-southeast-2",
    "mumbai": "ap-south-1",
    "sao paulo": "sa-east-1",
    "canada": "ca-central-1",
    "bahrain": "me-south-1",
    "cape town": "af-south-1",
}

SYSTEM_PROMPT_TEMPLATE = """You are an AWS CLI command generator. Given a natural language request, output ONLY the raw AWS CLI command. No markdown, no explanation, no code fences, no backticks — just the command itself.

Context:
- Active profile: {profile_name}
- Profile type: {profile_type}
- Region: {region}
- Account ID: {account_id}

Region name mappings (use these when the user refers to regions by city name):
{region_mappings}

Rules:
- Output exactly one AWS CLI command
- Do NOT include --profile flag (it's set automatically)
- Use --region flag when the user specifies a region
- Use --output json unless the user asks for a different format
- If the request is ambiguous, make a reasonable assumption
- Never include placeholder values — use the context above"""


def build_system_prompt(profile_name: str, profile_type: str, region: str, account_id: str) -> str:
    mappings = "\n".join(f"  {city} = {code}" for city, code in REGION_ALIASES.items())
    return SYSTEM_PROMPT_TEMPLATE.format(
        profile_name=profile_name,
        profile_type=profile_type,
        region=region,
        account_id=account_id,
        region_mappings=mappings,
    )


class LlmProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        """Yield text chunks from the LLM response."""
        ...

    @abstractmethod
    def test(self) -> str:
        """Send a trivial prompt and return the response text."""
        ...


class BedrockProvider(LlmProvider):
    """AWS Bedrock provider using a billing profile (NOT the customer profile)."""

    def __init__(self, config: dict):
        self.profile = config.get("bedrock_profile", "")
        self.region = config.get("bedrock_region", "us-east-1")
        self.model_id = config.get("model", "anthropic.claude-sonnet-4-5-20250929-v1:0")

    def _get_client(self):
        import boto3
        session = boto3.Session(profile_name=self.profile)
        return session.client("bedrock-runtime", region_name=self.region)

    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        client = self._get_client()
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        })
        response = client.invoke_model_with_response_stream(
            modelId=self.model_id,
            body=body,
            contentType="application/json",
        )
        for event in response["body"]:
            chunk = json.loads(event["chunk"]["bytes"])
            if chunk.get("type") == "content_block_delta":
                text = chunk.get("delta", {}).get("text", "")
                if text:
                    yield text

    def test(self) -> str:
        import botocore.config
        client = self._get_client()
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 64,
            "messages": [{"role": "user", "content": "Say OK"}],
        })
        response = client.invoke_model(
            modelId=self.model_id,
            body=body,
            contentType="application/json",
        )
        result = json.loads(response["body"].read())
        return result.get("content", [{}])[0].get("text", "")


class AnthropicProvider(LlmProvider):
    """Anthropic API provider with SSE streaming."""

    API_URL = "https://api.anthropic.com/v1/messages"

    def __init__(self, config: dict):
        self.api_key = config.get("api_key", "")
        self.model = config.get("model", "claude-sonnet-4-5-20250929")

    def _headers(self) -> dict:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        body = {
            "model": self.model,
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
            "stream": True,
        }
        with httpx.Client(timeout=60) as client:
            with client.stream("POST", self.API_URL, headers=self._headers(), json=body) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            event = json.loads(data)
                            if event.get("type") == "content_block_delta":
                                text = event.get("delta", {}).get("text", "")
                                if text:
                                    yield text
                        except json.JSONDecodeError:
                            continue

    def test(self) -> str:
        body = {
            "model": self.model,
            "max_tokens": 64,
            "messages": [{"role": "user", "content": "Say OK"}],
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(self.API_URL, headers=self._headers(), json=body)
            resp.raise_for_status()
            data = resp.json()
            return data.get("content", [{}])[0].get("text", "")


class OpenAIProvider(LlmProvider):
    """OpenAI API provider with SSE streaming."""

    API_URL = "https://api.openai.com/v1/chat/completions"

    def __init__(self, config: dict):
        self.api_key = config.get("api_key", "")
        self.model = config.get("model", "gpt-4o-mini")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_messages(self, system_prompt: str, user_message: str) -> list[dict]:
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        body = {
            "model": self.model,
            "messages": self._build_messages(system_prompt, user_message),
            "max_tokens": 1024,
            "stream": True,
        }
        with httpx.Client(timeout=60) as client:
            with client.stream("POST", self.API_URL, headers=self._headers(), json=body) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            event = json.loads(data)
                            text = event.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if text:
                                yield text
                        except json.JSONDecodeError:
                            continue

    def test(self) -> str:
        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": "Say OK"}],
            "max_tokens": 64,
        }
        with httpx.Client(timeout=30) as client:
            resp = client.post(self.API_URL, headers=self._headers(), json=body)
            resp.raise_for_status()
            data = resp.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")


class GoogleAIProvider(LlmProvider):
    """Google AI (Gemini) provider. Non-streaming, yields one chunk."""

    API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(self, config: dict):
        self.api_key = config.get("api_key", "")
        self.model = config.get("model", "gemini-2.5-flash")

    def _generate_content(self, system_prompt: str, user_message: str, timeout: int = 30) -> str:
        url = self.API_URL.format(model=self.model)
        body: dict = {
            "contents": [{"parts": [{"text": user_message}]}],
            "generationConfig": {"maxOutputTokens": 1024},
        }
        # Only include system_instruction when non-empty (Google rejects empty)
        if system_prompt:
            body["system_instruction"] = {"parts": [{"text": system_prompt}]}
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, params={"key": self.api_key}, json=body)
            resp.raise_for_status()
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
            return ""

    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        text = self._generate_content(system_prompt, user_message)
        if text:
            yield text

    def test(self) -> str:
        return self._generate_content("", "Say OK", timeout=15)


class OpenRouterProvider(LlmProvider):
    """OpenRouter provider (OpenAI-compatible API)."""

    API_URL = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self, config: dict):
        self.api_key = config.get("api_key", "")
        self.model = config.get("model", "anthropic/claude-sonnet-4.5")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 1024,
            "stream": True,
        }
        with httpx.Client(timeout=60) as client:
            with client.stream("POST", self.API_URL, headers=self._headers(), json=body) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            event = json.loads(data)
                            text = event.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if text:
                                yield text
                        except json.JSONDecodeError:
                            continue

    def test(self) -> str:
        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": "Say OK"}],
            "max_tokens": 64,
        }
        with httpx.Client(timeout=30) as client:
            resp = client.post(self.API_URL, headers=self._headers(), json=body)
            resp.raise_for_status()
            data = resp.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")


class OllamaProvider(LlmProvider):
    """Ollama provider with NDJSON streaming."""

    def __init__(self, config: dict):
        self.base_url = config.get("base_url", "http://localhost:11434").rstrip("/")
        self.model = config.get("model", "llama3")

    def generate(self, system_prompt: str, user_message: str) -> Generator[str, None, None]:
        body = {
            "model": self.model,
            "system": system_prompt,
            "prompt": user_message,
            "stream": True,
        }
        with httpx.Client(timeout=120) as client:
            with client.stream("POST", f"{self.base_url}/api/generate", json=body) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        text = data.get("response", "")
                        if text:
                            yield text
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    def test(self) -> str:
        body = {
            "model": self.model,
            "prompt": "Say OK",
            "stream": False,
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(f"{self.base_url}/api/generate", json=body)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")


PROVIDERS: dict[str, type[LlmProvider]] = {
    "bedrock": BedrockProvider,
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "google": GoogleAIProvider,
    "openrouter": OpenRouterProvider,
    "ollama": OllamaProvider,
}


def create_provider(provider_type: str, config: dict) -> LlmProvider:
    """Factory function to create a provider instance."""
    cls = PROVIDERS.get(provider_type)
    if not cls:
        raise ValueError(f"Unknown provider type: {provider_type}")
    return cls(config)
