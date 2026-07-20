def normalize_whitespace(value: str) -> str:
    """Collapse surrounding and repeated whitespace into single spaces."""

    return " ".join(value.split())


def require_normalized_text(value: str, field_name: str = "text") -> str:
    """Normalize user text and reject values that contain only whitespace."""

    normalized_value = normalize_whitespace(value)
    if not normalized_value:
        raise ValueError(f"{field_name} cannot be empty")
    return normalized_value
