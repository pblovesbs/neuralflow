"""
API route for the Standard Mode Wizard.
Builds a DAG payload dynamically based on a pre-defined use case template.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any

from api.models import DagWorkflow
from core.use_case_templates import generate_use_case_dag

router = APIRouter()

class WizardRequest(BaseModel):
    use_case_id: str = Field(..., description="ID of the selected use case (e.g. 'summarize')")
    config: Dict[str, Any] = Field(..., description="Configuration values for the use case (source_path, model, etc.)")

@router.post("/build-dag", response_model=DagWorkflow)
async def build_dag(req: WizardRequest):
    """
    Generate a DagWorkflow payload based on a wizard template and user configuration.
    """
    try:
        dag_dict = generate_use_case_dag(req.use_case_id, req.config)
        return DagWorkflow(**dag_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate DAG: {str(e)}")
