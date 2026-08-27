# AI Provider Routing — OpenAI, OpenRouter, OmniRoute, Ollama, MLX

Type: provider and model control reference
Status: adapter architecture; credentials, prices, quotas, and endpoint behavior require verification

## 1. Terms

- `ProviderConnection`: configured connection to one provider or endpoint; stores no secret in prompts.
- `ModelProfile`: versioned capability, context, modality, speed, cost, data policy, and allowed tasks.
- `AIRoutingPolicy`: versioned rule choosing deterministic code, local model, approved cloud model, or human review.
- `AgentConfigurationVersion`: agent instructions, schema, provider/model policy, budget, and threshold.
- `AgentRun`: one traceable execution.
- `CostEvent`: measured usage and estimated/confirmed cost.

GPT is a model family or model name, not a provider. OpenAI is a direct cloud provider. OpenRouter is an approved multi-provider gateway only when configured as such. OmniRoute is treated as a routing adapter/endpoint whose actual protocol, health behavior, and billing must be verified before production. Ollama and MLX are local runtime paths; MLX may be exposed through a compatible local server, but the exact adapter must be verified.

## 2. Provider records

Every provider record exposes only the controls needed by an operator:

- provider name and type;
- base URL and protocol (`openai-compatible`, native SDK, local runtime, CLI adapter);
- secret reference, never secret value;
- health status and last test;
- capabilities and supported modalities;
- data policy: local-only, cloud-approved, anonymize, block;
- region and retention notes;
- rate and concurrency limits;
- cost table version and currency;
- enabled/disabled state;
- allowed agent classes;
- fallback class, never a hidden model.

## 3. Routing policy

1. Use deterministic code whenever parsing, calculation, rule evaluation, aggregation, schema validation, or rendering is sufficient.
2. Prefer local `small` for classification, extraction from already-authorized text, simple grouping, and constrained rewriting.
3. Use approved cloud `small` only when local capability, latency, or quality is insufficient and the provider/data policy allows it.
4. Use a larger model only for an explicitly approved ambiguous synthesis with a hard budget.
5. Never silently replace the model explicitly selected for a workflow step.
6. If no permitted model is available, stop with `BLOCK` or request human intervention.

## 4. Token and cost control

Each run records:

- input tokens and output tokens when supplied by provider;
- prompt/cache tokens when available;
- duration and retry count;
- model/provider and configuration version;
- estimated cost before call and confirmed cost after call;
- budget consumed by agent, pipeline, prospect, provider, and period.

Before execution:

`estimated_cost = input_units × input_rate + output_units × output_rate + fixed_call_cost`

If the estimate exceeds the step, pipeline, or global cap, the Control Plane blocks or requests confirmation. At 50%, 80%, and 100%, the cockpit shows alerts; 100% is a hard stop unless explicitly raised.

## 5. Cockpit controls

The operator can use compact actions:

- `+ Add provider`;
- `Test connection`;
- `Test capability`;
- `Enable / Disable`;
- `Duplicate as new version`;
- `Set default for class`;
- `Set fallback for same class`;
- `View data policy`;
- `View cost table`;
- `Simulate route`;
- `Compare recent cost/latency`;
- `Rotate secret reference`;
- `Rollback configuration`.

Editing a provider or model changes a configuration version. In-progress runs stay pinned to their starting version. Changing a provider never changes the business workflow order.

## 6. Provider-specific boundary

### OpenAI / GPT

Direct cloud route for approved tasks. Store model identifiers and API behavior in `ModelProfile`; do not hard-code a GPT model name into an agent prompt. Verify current model availability, prices, retention, region, structured output, vision, and rate limits before activation.

### OpenRouter

Gateway route for explicitly approved providers/models. The registry must record the actual upstream model, data policy, fallback behavior, and cost attribution. OpenRouter is not permission to use an unknown provider or premium model.

### OmniRoute

Adapter route for the locally controlled routing layer. It must expose health, selected upstream, model class, timeout, cost attribution, and failure reason. If it cannot provide those fields, it may be used for experimentation but not as the source of truth for production cost or provenance.

### Ollama

Local runtime route. The registry records local model name, quantization, context limit, hardware, loaded state, and measured tokens/sec. No cloud fallback occurs unless the policy explicitly permits an approved same-class route.

### MLX

Local Apple Silicon runtime route. Treat the serving interface as an adapter and record model, quantization, context, memory, throughput, and endpoint health. Do not assume that an MLX model is automatically compatible with an OpenAI protocol.

## 7. Data boundary

Public restaurant facts and approved commercial content may be sent to an approved cloud provider if policy permits. Secrets, payment data, private credentials, unnecessary personal information, and local-only data remain local or blocked. The provider test must include a data-policy check, not only a successful HTTP response.
