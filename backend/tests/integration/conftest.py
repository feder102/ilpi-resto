"""Integration test configuration - disables rate limiting for tests."""

import pytest
from unittest.mock import MagicMock
from app.main import limiter


# Store the original storage for restoration
_original_storage = None
_mock_storage = None


@pytest.fixture(scope="session", autouse=True)
def setup_rate_limiter_mock():
    """Setup mock rate limiter for the entire test session."""
    global _original_storage, _mock_storage

    # Save the original storage
    _original_storage = limiter._storage

    # Create a mock storage that never actually limits
    _mock_storage = MagicMock()
    _mock_storage.incr = MagicMock(return_value=0)
    _mock_storage.get = MagicMock(return_value=0)
    _mock_storage.clear = MagicMock()

    # Replace the limiter's internal _storage for the entire session
    limiter._storage = _mock_storage

    yield

    # Restore original storage after all tests
    limiter._storage = _original_storage


@pytest.fixture(scope="function", autouse=True)
def reset_rate_limiter_per_test():
    """Reset rate limiter state before each test."""
    global _mock_storage

    # Re-apply the mock storage if it's been replaced
    if limiter._storage is not _mock_storage:
        limiter._storage = _mock_storage

    # Clear the mock storage state
    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "reset_mock"):
        try:
            limiter._storage.reset_mock()
        except Exception:
            pass

    yield
