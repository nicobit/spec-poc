import backend.function_environment.__init__ as fe


def test_no_stages_returns_none():
    details = {"stages": []}
    assert fe._derive_type_from_stages(details) is None


def test_single_type_returns_type():
    details = {"stages": [{"resourceActions": [{"type": "aws-ec2"}]}, {"resourceActions": [{"type": "aws-ec2"}]}]}
    assert fe._derive_type_from_stages(details) == "aws-ec2"


def test_common_prefix_returns_prefix():
    details = {"stages": [{"resourceActions": [{"type": "gcp-k8s"}]}, {"resourceActions": [{"type": "gcp-sql"}]}]}
    # both types share prefix 'gcp' before '-'
    assert fe._derive_type_from_stages(details) == "gcp"


def test_mixed_types_returns_mixed():
    details = {"stages": [{"resourceActions": [{"type": "aws-ec2"}]}, {"resourceActions": [{"type": "gcp-sql"}]}]}
    assert fe._derive_type_from_stages(details) == "mixed"


def test_handles_non_dict_resource_action():
    details = {"stages": [{"resourceActions": [None, "string", {"type": "azure-vm"}]}]}
    assert fe._derive_type_from_stages(details) == "azure-vm"
