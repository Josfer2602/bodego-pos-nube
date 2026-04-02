from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from database import get_db
import models, schemas, auth

router = APIRouter(
    prefix="/cash",
    tags=["cash_sessions"]
)

@router.get("/sessions", response_model=List[schemas.CashSessionResponse])
def get_all_sessions(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    sessions = db.query(models.CashSession).filter(
        models.CashSession.project_id == project_id
    ).order_by(models.CashSession.opened_at.desc()).all()
    
    return sessions

@router.get("/current", response_model=schemas.CashSessionResponse)
def get_current_session(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    # Validate permissions
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    session = db.query(models.CashSession).filter(
        models.CashSession.project_id == project_id,
        models.CashSession.status == "open"
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="No active cash session found")
        
    return session

@router.get("/{session_id}/summary")
def get_session_summary(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    session = db.query(models.CashSession).filter(models.CashSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    project = session.project
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Agrupar las ventas por payment_method
    sales_summary = db.query(
        models.Sale.payment_method, 
        func.sum(models.Sale.total).label("total")
    ).filter(
        models.Sale.session_id == session_id
    ).group_by(models.Sale.payment_method).all()
    
    totals = {
        "efectivo": 0.0,
        "tarjeta": 0.0,
        "transferencia": 0.0
    }
    
    for method, total in sales_summary:
        m = method.lower()
        if "tarjeta" in m:
            totals["tarjeta"] += float(total)
        elif "yape" in m or "plin" in m or "transferencia" in m:
            totals["transferencia"] += float(total)
        else:
            totals["efectivo"] += float(total)
            
    expected_cash = session.initial_cash + totals["efectivo"]
    expected_card = totals["tarjeta"]
    expected_transfer = totals["transferencia"]
    
    return {
        "initial_cash": session.initial_cash,
        "sales_cash": totals["efectivo"],
        "expected_cash": expected_cash,
        "expected_card": expected_card,
        "expected_transfer": expected_transfer,
        "total_expected": expected_cash + expected_card + expected_transfer
    }

@router.post("/open", response_model=schemas.CashSessionResponse)
def open_session(session_data: schemas.CashSessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == session_data.project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Check if there is already an open session
    existing = db.query(models.CashSession).filter(
        models.CashSession.project_id == session_data.project_id,
        models.CashSession.status == "open"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="There is already an open session for this project")
        
    new_session = models.CashSession(
        project_id=session_data.project_id,
        user_id=current_user.id,
        initial_cash=session_data.initial_cash,
        status="open",
        opened_at=datetime.utcnow()
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.post("/close/{session_id}", response_model=schemas.CashSessionResponse)
def close_session(session_id: int, closing_data: schemas.CashSessionClose, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    session = db.query(models.CashSession).filter(models.CashSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status == "closed":
        raise HTTPException(status_code=400, detail="Session is already closed")
        
    project = session.project
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # Get exact summary
    sales_summary = db.query(
        models.Sale.payment_method, 
        func.sum(models.Sale.total).label("total")
    ).filter(
        models.Sale.session_id == session_id
    ).group_by(models.Sale.payment_method).all()
    
    totals = {"efectivo": 0.0, "tarjeta": 0.0, "transferencia": 0.0}
    for method, total in sales_summary:
        m = method.lower()
        if "tarjeta" in m:
            totals["tarjeta"] += float(total)
        elif "yape" in m or "plin" in m or "transferencia" in m:
            totals["transferencia"] += float(total)
        else:
            totals["efectivo"] += float(total)
            
    # Calculate expected
    session.expected_cash = session.initial_cash + totals["efectivo"]
    session.expected_card = totals["tarjeta"]
    session.expected_transfer = totals["transferencia"]
    
    # Assign actual
    session.actual_cash = closing_data.actual_cash
    session.actual_card = closing_data.actual_card
    session.actual_transfer = closing_data.actual_transfer
    
    # Difference (Actual total - Expected Total)
    total_expected = session.expected_cash + session.expected_card + session.expected_transfer
    total_actual = session.actual_cash + session.actual_card + session.actual_transfer
    session.difference = total_actual - total_expected
    
    session.closed_at = datetime.utcnow()
    session.status = "closed"
    
    db.commit()
    db.refresh(session)
    return session
