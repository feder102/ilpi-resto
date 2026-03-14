"""
Background job scheduler for automatic time tracking (Feature 008).

Sets up APScheduler for nightly automatic time entry generation.
Processes all shifts for previous day and creates TimeEntry records.
"""

import logging
import uuid
from datetime import datetime, timedelta, date

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    BackgroundScheduler = None
    CronTrigger = None

from sqlmodel import select

from app.database import SessionLocal
from app.models.tenant import Tenant
from app.services.time_tracking_service import TimeTrackingService, run_daily_batch_job as batch_wrapper
from app.common.time_tracking_exceptions import BatchProcessingError, NoShiftsFoundError

logger = logging.getLogger(__name__)

# Only create scheduler if apscheduler is available
scheduler = BackgroundScheduler() if APSCHEDULER_AVAILABLE else None


def run_daily_batch_job() -> None:
    """
    Execute daily automatic time entry generation for all active tenants.

    This function is called by the scheduler at a configured time (default: 01:00).
    It processes all shifts from the previous day and creates TimeEntry records.
    Handles errors gracefully - failures for one tenant don't stop processing others.
    """
    db = None
    try:
        db = SessionLocal()

        # Get yesterday's date
        yesterday = date.today() - timedelta(days=1)

        logger.info(
            f"Starting batch job for date: {yesterday}",
            extra={"process_date": str(yesterday), "action": "batch_start"}
        )

        # Get all active tenants from database
        tenants = db.exec(select(Tenant)).all()

        if not tenants:
            logger.warning(
                "No tenants found in database",
                extra={"action": "batch_no_tenants"}
            )
            return

        # Process each tenant
        total_entries = 0
        for tenant in tenants:
            try:
                result = batch_wrapper(
                    db=db,
                    tenant_id=uuid.UUID(str(tenant.id)),
                    process_date=yesterday,
                )

                total_entries += result.get("entries_created", 0)

                if result["status"] != "error":
                    logger.info(
                        f"Batch job completed for tenant {tenant.id}",
                        extra={
                            "tenant_id": str(tenant.id),
                            "process_date": str(yesterday),
                            "entries_created": result.get("entries_created", 0),
                            "action": "batch_complete",
                        }
                    )
                else:
                    logger.error(
                        f"Batch job error for tenant {tenant.id}: {result['message']}",
                        extra={
                            "tenant_id": str(tenant.id),
                            "process_date": str(yesterday),
                            "error": result["message"],
                            "action": "batch_error",
                        }
                    )

            except NoShiftsFoundError:
                logger.debug(
                    f"No shifts found for tenant {tenant.id} on {yesterday}",
                    extra={
                        "tenant_id": str(tenant.id),
                        "process_date": str(yesterday),
                        "action": "batch_no_shifts",
                    }
                )
            except Exception as e:
                logger.error(
                    f"Unexpected error processing tenant {tenant.id}: {str(e)}",
                    extra={
                        "tenant_id": str(tenant.id),
                        "process_date": str(yesterday),
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "action": "batch_error",
                    }
                )

        logger.info(
            f"Daily batch job completed",
            extra={
                "process_date": str(yesterday),
                "total_entries_created": total_entries,
                "tenants_processed": len(tenants),
                "action": "batch_job_complete",
            }
        )

    except Exception as e:
        logger.error(
            f"Critical error in batch job: {str(e)}",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "action": "batch_critical_error",
            }
        )
    finally:
        if db:
            try:
                db.close()
            except:
                pass


def start_scheduler(batch_hour: int = 1, batch_minute: int = 0) -> None:
    """
    Start the background scheduler with daily batch job.

    Args:
        batch_hour: Hour of day to run batch job (0-23, default: 1)
        batch_minute: Minute of hour to run batch job (0-59, default: 0)
    """
    if not APSCHEDULER_AVAILABLE or scheduler is None:
        logger.warning("APScheduler is not installed. Background scheduler will not run.")
        return

    if not scheduler.running:
        # Add job: Run daily at specified time (default: 01:00 AM)
        scheduler.add_job(
            run_daily_batch_job,
            CronTrigger(hour=batch_hour, minute=batch_minute),
            id="daily_time_tracking_batch",
            name="Daily automatic time entry generation",
            replace_existing=True,
        )

        scheduler.start()
        logger.info(
            f"Scheduler started - batch job scheduled for {batch_hour:02d}:{batch_minute:02d} daily",
            extra={
                "batch_hour": batch_hour,
                "batch_minute": batch_minute,
                "action": "scheduler_start",
            }
        )


def stop_scheduler() -> None:
    """Stop the background scheduler gracefully."""
    if scheduler is not None and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped", extra={"action": "scheduler_stop"})
