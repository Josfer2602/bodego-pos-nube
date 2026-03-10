from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import models, auth
from database import get_db

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)

@router.get("/dashboard", response_model=dict)
def get_dashboard_kpis(project_id: int, days: int = 30, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Fechas
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Ventas Totales en el periodo
    total_sales_value = db.query(func.sum(models.Sale.total)).filter(
        models.Sale.project_id == project_id,
        models.Sale.date >= start_date
    ).scalar() or 0.0

    # Total de Ventas (Transacciones)
    total_transactions = db.query(models.Sale).filter(
        models.Sale.project_id == project_id,
        models.Sale.date >= start_date
    ).count()

    # Productos con bajo stock (< 10)
    low_stock_products = db.query(models.Product).filter(
        models.Product.project_id == project_id,
        models.Product.stock < 10
    ).all()
    
    # Productos próximos a vencer (en los próximos 30 días)
    warning_date = end_date.date() + timedelta(days=30)
    expiring_products = db.query(models.Product).filter(
        models.Product.project_id == project_id,
        models.Product.expiration_date != None,
        models.Product.expiration_date <= warning_date,
        models.Product.expiration_date >= end_date.date()
    ).all()

    # Ventas por día (Gráfico de línea)
    # SQLAlchemy sqlite date casting puede ser tricky, agruparemos trayendo la lista y luego en python
    sales = db.query(models.Sale).filter(
        models.Sale.project_id == project_id,
        models.Sale.date >= start_date
    ).all()

    sales_by_date = {}
    for s in sales:
        date_str = s.date.strftime("%Y-%m-%d")
        if date_str not in sales_by_date:
            sales_by_date[date_str] = 0.0
        sales_by_date[date_str] += s.total

    # Ordenar por fecha cronológicamente
    chart_data = [{"date": k, "total": v} for k, v in sorted(sales_by_date.items())]

    # Calcular ganancias
    # Costo de los productos vendidos
    total_cost_value = db.query(
        func.sum(models.SaleDetail.quantity * models.Product.cost)
    ).join(models.Product).join(models.Sale).filter(
        models.Sale.project_id == project_id,
        models.Sale.date >= start_date
    ).scalar() or 0.0

    net_profit = total_sales_value - total_cost_value

    # Productos más vendidos
    top_products_query = db.query(
        models.Product.name,
        func.sum(models.SaleDetail.quantity).label('total_qty')
    ).join(models.SaleDetail).join(models.Sale).filter(
        models.Sale.project_id == project_id,
        models.Sale.date >= start_date
    ).group_by(models.Product.name).order_by(func.sum(models.SaleDetail.quantity).desc()).limit(5).all()

    top_products = [{"name": p[0], "quantity": p[1]} for p in top_products_query]

    return {
        "summary": {
            "total_revenue": total_sales_value,
            "total_transactions": total_transactions,
            "net_profit": net_profit,
            "low_stock_count": len(low_stock_products),
            "expiring_count": len(expiring_products)
        },
        "revenue_chart": chart_data,
        "top_products": top_products,
        "alerts": {
            "low_stock": [{"id": p.id, "name": p.name, "stock": p.stock} for p in low_stock_products[:5]], # top 5 alertas
            "expiring": [{"id": p.id, "name": p.name, "date": str(p.expiration_date)} for p in expiring_products[:5]]
        }
    }
