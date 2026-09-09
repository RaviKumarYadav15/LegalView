def basename(path: str) -> str:
    """Return just the filename, whether the path uses '/' or '\\'."""
    return path.replace("\\", "/").rsplit("/", 1)[-1]
