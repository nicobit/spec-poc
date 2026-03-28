from backend.shared import authz
print('roles:', authz.get_roles_from_claims({'roles':['envadmin','some-other']}))
print('has_any_role:', authz.has_any_role({'roles':['envadmin','some-other']}, ['environment-manager']))
