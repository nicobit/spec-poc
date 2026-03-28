# Module Authorization Register

This document records the effective authorization policy for application modules, frontend areas, and backend APIs.

Use it as the operational map for answering:

- who can access what
- which routes are public
- which modules require only sign-in
- which capabilities require elevated roles

This document should be updated whenever any route, page, or API changes its access behavior.

## Update Rule

For every feature that changes access behavior:

1. update the relevant rows in this document
2. update [access-control-matrix.md](access-control-matrix.md) if role meaning changes
3. update the feature spec, API spec, and test plan

## Register

| Module / Area | Frontend Route / Surface | Backend API / Runtime Surface | Access Level | Required Roles | Source Of Truth | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Health liveness | n/a or infrastructure checks | `GET /health/healthz` | public | none | [health_router.py](../../backend/function_health/app/health_router.py) | Repository policy keeps this as the only public backend route |
| Health diagnostics | health-related admin UI or direct API use | `/health/deps`, `/health/config/schema`, `/health/config/validate` | authenticated or role-restricted | document exact requirement per feature | [health_router.py](../../backend/function_health/app/health_router.py), [config_router.py](../../backend/function_health/app/config_router.py) | Must not be treated as public |
| User / account area | `/user`, account surfaces | user-scoped API calls | authenticated | `AuthenticatedUser` unless elevated action requires more | [UserPage.tsx](../../frontend/src/features/user/pages/UserPage.tsx) | Keep user-scoped actions distinct from admin actions |
| Costs | `/costs` | `/costs/...` routes | authenticated with admin-only exceptions where documented | `AuthenticatedUser`, `Admin` for privileged operations | [fastapi_app.py](../../backend/function_costs/appl/fastapi_app.py) | Cache clearing and privileged maintenance must stay role-restricted |
| Environments management | `/environment` | environment scheduler and environment APIs | role-restricted | `Admin` or `EnvironmentManager` | [feature-spec.md](../../specs/features/FEAT-ADMIN-002-environments-management/feature-spec.md) | Keep frontend, backend, and docs aligned on allowed roles |
| Query examples | query examples views | `/queryexamples/...` | authenticated | `AuthenticatedUser` unless feature spec says otherwise | backend/queryexamples implementation | Update when route behavior changes |
| Text-to-SQL | `/chat`, `/questions`, NL-to-SQL flows | `/texttosql/...` | authenticated | `AuthenticatedUser` unless role-restricted by feature | frontend chat/questions surfaces and text-to-sql backend | Public access is not allowed |
| Dashboard | `/` and dashboard widgets | dashboard backing APIs | authenticated | `AuthenticatedUser` unless widget says otherwise | dashboard feature code and backing APIs | Each new widget with special auth should add an explicit note |

## Module Documentation Pattern

When a module needs more detail than the table can carry, add a small subsection:

### Example Module

- Purpose:
- Allowed roles:
- Restricted actions:
- Public exceptions:
- Frontend enforcement:
- Backend enforcement:
- Tests covering auth behavior:

## Review Questions

- Is every module row still accurate after the latest feature change?
- Are frontend route guards and backend decorators aligned?
- Are elevated actions documented separately from basic read access?
- Are public exceptions minimal and intentional?
