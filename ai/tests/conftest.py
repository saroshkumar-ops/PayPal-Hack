import pytest
from core.config import settings

@pytest.fixture(autouse=True)
def force_mock_for_tests():
    """Forces mock mode during unit test execution so tests are offline & instant."""
    original = settings.USE_MOCK_AI
    settings.USE_MOCK_AI = True
    yield
    settings.USE_MOCK_AI = original
