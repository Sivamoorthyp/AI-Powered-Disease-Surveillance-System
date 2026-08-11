from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv
import pandas as pd
import datetime
from typing import Optional, List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from pydantic import BaseModel

from app.database import get_db
from app import models, analytics

class ExportRequest(BaseModel):
    district: Optional[str] = None
    disease_id: Optional[int] = None
    local_cases: List[Dict[str, Any]] = []

router = APIRouter(prefix="/reports", tags=["Surveillance Reports"])

@router.post("/export/csv")
def export_cases_csv(
    request: ExportRequest,
    db: Session = Depends(get_db)
):
    query = db.query(models.CaseReport)
    if request.district:
        query = query.filter(models.CaseReport.district == request.district)
    if request.disease_id:
        query = query.filter(models.CaseReport.disease_id == request.disease_id)
        
    cases = query.all()
    
    # Filter local cases if district is specified
    local_cases_filtered = request.local_cases
    if request.district:
        local_cases_filtered = [c for c in request.local_cases if c.get("place", "").lower() == request.district.lower()]
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Report ID", "Patient ID", "Disease", "Severity", "Age", "Gender",
        "Village", "Block", "District", "Latitude", "Longitude", "Status",
        "Clinical Status", "Date Reported", "Hospital"
    ])
    
    for c in cases:
        writer.writerow([
            c.id, c.patient_id, c.disease.name if c.disease else "Unknown",
            c.severity, c.age, c.gender, c.village, c.block, c.district,
            c.latitude, c.longitude, c.status, c.clinical_status,
            c.report_date.isoformat(), c.hospital_name
        ])
        
    for idx, c in enumerate(local_cases_filtered):
        writer.writerow([
            f"LOCAL-{idx}", c.get("patient_id", f"P-LOCAL-{idx}"), c.get("disease", "Unknown"),
            c.get("severity", "Medium"), 0, "Unknown", "", "", c.get("place", "Unknown"),
            0.0, 0.0, "Active", "Stable", c.get("registeredAt", datetime.datetime.now().isoformat()), ""
        ])
        
    output.seek(0)
    
    headers = {"Content-Disposition": "attachment; filename=odisha_disease_surveillance_report.csv"}
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv", headers=headers)

from typing import Optional

@router.post("/export/excel")
def export_cases_excel(
    request: ExportRequest,
    db: Session = Depends(get_db)
):
    query = db.query(models.CaseReport)
    if request.district:
        query = query.filter(models.CaseReport.district == request.district)
    if request.disease_id:
        query = query.filter(models.CaseReport.disease_id == request.disease_id)
        
    cases = query.all()
    
    # Filter local cases if district is specified
    local_cases_filtered = request.local_cases
    if request.district:
        local_cases_filtered = [c for c in request.local_cases if c.get("place", "").lower() == request.district.lower()]
    
    # Construct DataFrame
    data = []
    for c in cases:
        data.append({
            "Report ID": c.id,
            "Patient ID": c.patient_id,
            "Disease": c.disease.name if c.disease else "Unknown",
            "Severity": c.severity,
            "Age": c.age,
            "Gender": c.gender,
            "Village": c.village,
            "Block": c.block,
            "District": c.district,
            "Latitude": c.latitude,
            "Longitude": c.longitude,
            "Status": c.status,
            "Clinical Status": c.clinical_status,
            "Date Reported": c.report_date.isoformat(),
            "Hospital": c.hospital_name
        })
        
    for idx, c in enumerate(local_cases_filtered):
        data.append({
            "Report ID": f"LOCAL-{idx}",
            "Patient ID": c.get("patient_id", f"P-LOCAL-{idx}"),
            "Disease": c.get("disease", "Unknown"),
            "Severity": c.get("severity", "Medium"),
            "Age": 0,
            "Gender": "Unknown",
            "Village": "",
            "Block": "",
            "District": c.get("place", "Unknown"),
            "Latitude": 0.0,
            "Longitude": 0.0,
            "Status": "Active",
            "Clinical Status": "Stable",
            "Date Reported": c.get("registeredAt", datetime.datetime.now().isoformat()),
            "Hospital": ""
        })
        
    df = pd.DataFrame(data)
    
    # Save to buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Surveillance Data')
        
    output.seek(0)
    
    headers = {"Content-Disposition": "attachment; filename=odisha_disease_surveillance_report.xlsx"}
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)

@router.post("/export/pdf")
def export_surveillance_pdf(
    request: ExportRequest,
    db: Session = Depends(get_db)
):
    # Fetch statistics summary
    stats = analytics.get_stats_summary(db)
    
    # Merge local cases into stats
    local_cases_filtered = request.local_cases
    if request.district:
        local_cases_filtered = [c for c in request.local_cases if c.get("place", "").lower() == request.district.lower()]
        
    local_total = sum([c.get("count", 1) for c in local_cases_filtered])
    if local_total > 0:
        stats["total_cases_today"] += local_total
        stats["total_cases_week"] += local_total
        
        # Merge top diseases
        dis_counts = {d["name"]: d["value"] for d in stats["top_diseases"]}
        for c in local_cases_filtered:
            d_name = c.get("disease", "Unknown")
            dis_counts[d_name] = dis_counts.get(d_name, 0) + c.get("count", 1)
            
        stats["top_diseases"] = [{"name": k, "value": v} for k, v in sorted(dis_counts.items(), key=lambda item: item[1], reverse=True)]
    
    # Create dynamic PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'GovTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0b2545'),
        alignment=1, # Center
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'GovSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#555555'),
        alignment=1,
        spaceAfter=20
    )
    
    header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#f26419'),
        spaceBefore=10,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=8
    )

    story = []
    
    # Header Section
    story.append(Paragraph("GOVERNMENT OF ODISHA", title_style))
    story.append(Paragraph("DEPARTMENT OF HEALTH & FAMILY WELFARE", title_style))
    story.append(Paragraph("INTELLIGENT DISEASE SURVEILLANCE & OUTBREAK REPORT", title_style))
    story.append(Paragraph(f"Report Generated: {datetime.datetime.now().strftime('%d %B %Y, %I:%M %p')}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Stats Overview Table
    story.append(Paragraph("1. State-wide Surveillance Summary (Today)", header_style))
    
    summary_data = [
        ["Total Cases Today", f"{stats['total_cases_today']}", "Recovered Cases", f"{stats['recovered']}"],
        ["Weekly Case Trend", f"{stats['total_cases_week']}", "Mortalities (Deaths)", f"{stats['deaths']}"],
        ["Active Outbreak Clusters", f"{stats['active_outbreaks']}", "Most Affected Region", f"{stats['most_affected_district']}"]
    ]
    
    t = Table(summary_data, colWidths=[150, 100, 150, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8f9fa')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#333333')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd')),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))
    
    # Risk Containment Section
    story.append(Paragraph("2. Threat Analysis & Alert Status", header_style))
    story.append(Paragraph(f"<b>High-Risk Containment Zones:</b> {', '.join(stats['high_risk_areas'])}", body_style))
    story.append(Paragraph(f"<b>Medium-Alert Districts:</b> {', '.join(stats['medium_risk_areas'])}", body_style))
    story.append(Paragraph(f"<b>Low-Risk Operations:</b> {', '.join(stats['low_risk_areas'])}", body_style))
    
    # Top Diseases List
    story.append(Spacer(1, 15))
    story.append(Paragraph("3. Top 5 Vector-Borne & Infectious Pathogens Reported", header_style))
    
    dis_headers = [["Pathogen", "Case Count"]]
    for d in stats['top_diseases'][:5]:
        dis_headers.append([d['name'], str(d['value'])])
        
    t_dis = Table(dis_headers, colWidths=[200, 100])
    t_dis.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor('#0b2545')),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8f9fa')])
    ]))
    story.append(t_dis)
    
    # Footer disclaimer
    story.append(Spacer(1, 40))
    story.append(Paragraph("<i>This document is a certified report from the Integrated Disease Surveillance Portal. All inputs are aggregated automatically from real-time hospital and ASHA feeds. Action directives are computed via spatial clustering heuristics.</i>", subtitle_style))
    
    doc.build(story)
    buffer.seek(0)
    
    headers = {"Content-Disposition": "attachment; filename=odisha_disease_surveillance_report.pdf"}
    return StreamingResponse(buffer, media_type="application/pdf", headers=headers)
