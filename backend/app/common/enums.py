"""T003: Enumeration types for categorical fields."""

from enum import Enum


class ShiftTypeEnum(str, Enum):
    """Standard shift type categories."""

    MAÑANA = "MAÑANA"      # Morning shift (e.g., 10:30-18:00)
    NOCHE = "NOCHE"        # Evening/night shift to close (e.g., 17:00-Cierre)
    CORTADO = "CORTADO"    # Split shift with break (e.g., 12:30-16:30, 18:30-22:30)
    CORRIDO = "CORRIDO"    # Continuous shift to close (e.g., 14:00-Cierre)
