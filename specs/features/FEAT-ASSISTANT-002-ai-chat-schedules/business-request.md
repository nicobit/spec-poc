# Business Request: AI Chat for Schedules, Clients, Environments, and Failures

Summary
-------
Add an in-app AI chat assistant that answers natural-language questions about clients, environments, schedules and schedule failures. The assistant should return explanations, interpretation of failure causes, and recommended remediation steps.

Stakeholders
------------
- Support Engineers
- SREs / Platform Engineers
- Product Managers

Motivation
----------
Support and operations staff want faster diagnosis of failed schedules and contextual answers about clients and environments without manually navigating multiple screens.

Scope
-----
- Use existing backend endpoints for schedule/client/environment/failure data.
- Use Azure OpenAI for language understanding and generation.
- Provide natural-language Q&A, failure interpretation, and remediation suggestions.

Out of scope
------------
- Automated remediation (action execution) — only recommendations.

Acceptance Criteria
-------------------
- User can ask natural language questions in the web UI and receive relevant answers.
- Answers include references to the data used (schedule id, timestamps, client id) and suggested remediation steps when failures are involved.
- All calls to Azure OpenAI go through backend server-side proxying (no direct client keys).
- Access control: only authorized users may query client/schedule data.

Assumptions
-----------
- Backend has endpoints exposing schedule, client, environment and failure details (e.g., `/api/schedules`, `/api/clients`, `/api/environments`, `/api/schedules/{id}/failures`).
- Azure OpenAI access and keys are available via backend configuration/secrets.
- Responses must avoid exposing sensitive PII; backend will redact or control access.
