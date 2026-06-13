"""
cron_scheduler.py — Time-Based Cron Scheduler Trigger.
Uses APScheduler to trigger local execution of DAGs.
"""

from __future__ import annotations

import os
from typing import Optional

_SCHEDULER = None
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore

    _SCHEDULER_AVAILABLE = True
except ImportError:
    _SCHEDULER_AVAILABLE = False


# Local persistent storage for jobs
STORAGE_DIR = os.path.expanduser("~/.neuralflow/scheduler")


def get_scheduler():
    """Get or initialize the global APScheduler instance."""
    global _SCHEDULER
    if not _SCHEDULER_AVAILABLE:
        return None

    if _SCHEDULER is None:
        os.makedirs(STORAGE_DIR, exist_ok=True)
        db_path = os.path.join(STORAGE_DIR, "jobs.sqlite")

        jobstores = {"default": SQLAlchemyJobStore(url=f"sqlite:///{db_path}")}
        _SCHEDULER = AsyncIOScheduler(jobstores=jobstores)

    return _SCHEDULER


def start_scheduler():
    scheduler = get_scheduler()
    if scheduler and not scheduler.running:
        scheduler.start()


def stop_scheduler():
    scheduler = get_scheduler()
    if scheduler and scheduler.running:
        scheduler.shutdown()


async def _execute_scheduled_workflow(workflow_id: str):
    """Callback for scheduled job. Loads DAG and fires execution."""
    import json
    from api.models import DagWorkflow
    from core.executor import broadcast_log
    from api.routes.execute import _run_workflow
    from api.routes.websocket import manager

    try:
        wf_path = os.path.expanduser(f"~/.neuralflow/workflows/{workflow_id}.json")
        if not os.path.exists(wf_path):
            await broadcast_log(
                manager,
                "system",
                f"Scheduled workflow {workflow_id} not found on disk.",
                "ERROR",
            )
            return

        with open(wf_path, "r") as f:
            data = json.load(f)

        workflow = DagWorkflow(**data)

        await broadcast_log(
            manager,
            "system",
            f"⏰ Triggering scheduled workflow: {workflow_id}",
            "INFO",
        )

        # Run workflow in background task (we are already async here)
        import asyncio

        asyncio.create_task(_run_workflow(workflow))

    except Exception as e:
        print(f"Cron execution failed for {workflow_id}: {e}")


def add_job(
    workflow_id: str,
    cron_expr: Optional[str] = None,
    interval_seconds: Optional[int] = None,
):
    """Add a job to the scheduler."""
    if not _SCHEDULER_AVAILABLE:
        raise ImportError("APScheduler not installed")

    scheduler = get_scheduler()

    # Remove existing job for this workflow if exists
    try:
        scheduler.remove_job(workflow_id)
    except Exception:
        pass

    if cron_expr:
        trigger = CronTrigger.from_crontab(cron_expr)
    elif interval_seconds:
        trigger = IntervalTrigger(seconds=interval_seconds)
    else:
        raise ValueError("Must provide either cron_expr or interval_seconds")

    scheduler.add_job(
        _execute_scheduled_workflow,
        trigger=trigger,
        args=[workflow_id],
        id=workflow_id,
        replace_existing=True,
    )


def remove_job(workflow_id: str):
    """Remove a job from the scheduler."""
    if not _SCHEDULER_AVAILABLE:
        return

    scheduler = get_scheduler()
    try:
        scheduler.remove_job(workflow_id)
    except Exception:
        pass
