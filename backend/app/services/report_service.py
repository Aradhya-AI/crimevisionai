import os
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from app.config import settings

class ReportGeneratorService:
    def __init__(self):
        self.reports_dir = Path(settings.REPORTS_DIR)
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_pdf(
        self,
        report_id: str,
        case_info: Dict[str, Any],
        evidence_list: List[Dict[str, Any]],
        analysis_records: List[Dict[str, Any]],
        timeline_events: List[Dict[str, Any]],
        investigator_name: str = "Lead Forensic Examiner",
        notes: str = ""
    ) -> str:
        """
        Generates a comprehensive forensic examination PDF report using ReportLab.
        Returns the absolute path to the generated PDF file.
        """
        pdf_filename = f"{report_id}_{case_info.get('id', 'case')}.pdf"
        output_path = self.reports_dir / pdf_filename

        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
            )
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.pdfgen import canvas

            class NumberedCanvas(canvas.Canvas):
                """Two-pass canvas to dynamically compute and print 'Page X of Y'"""
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self._saved_page_states = []

                def showPage(self):
                    self._saved_page_states.append(dict(self.__dict__))
                    self._startPage()

                def save(self):
                    num_pages = len(self._saved_page_states)
                    for state in self._saved_page_states:
                        self.__dict__.update(state)
                        self.draw_page_decorations(num_pages)
                        super().showPage()
                    super().save()

                def draw_page_decorations(self, page_count):
                    self.saveState()
                    self.setFont("Helvetica", 8)
                    self.setFillColor(colors.HexColor("#64748b"))
                    
                    # Header
                    self.drawString(54, 755, f"CRIMEVISION AI — FORENSIC EXAMINATION REPORT | REF: {case_info.get('id')}")
                    self.setStrokeColor(colors.HexColor("#cbd5e1"))
                    self.setLineWidth(0.5)
                    self.line(54, 747, 558, 747)

                    # Footer
                    self.line(54, 45, 558, 45)
                    self.drawString(54, 34, "CONFIDENTIAL & PROPRIETARY — LAW ENFORCEMENT DECISION SUPPORT ONLY")
                    page_text = f"Page {self._pageNumber} of {page_count}"
                    self.drawRightString(558, 34, page_text)
                    self.restoreState()

            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=letter,
                leftMargin=54,
                rightMargin=54,
                topMargin=54,
                bottomMargin=54
            )

            styles = getSampleStyleSheet()

            # Custom Forensic Styles
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=20,
                leading=24,
                textColor=colors.HexColor('#0b111a'),
                spaceAfter=6
            )
            subtitle_style = ParagraphStyle(
                'DocSubTitle',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=11,
                leading=14,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=14
            )
            h1_style = ParagraphStyle(
                'H1',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=13,
                leading=16,
                textColor=colors.HexColor('#0f172a'),
                spaceBefore=14,
                spaceAfter=8
            )
            body_style = ParagraphStyle(
                'Body',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                leading=13,
                textColor=colors.HexColor('#334155')
            )
            body_bold = ParagraphStyle(
                'BodyBold',
                parent=body_style,
                fontName='Helvetica-Bold'
            )
            legal_disclaimer = ParagraphStyle(
                'Legal',
                parent=styles['Normal'],
                fontName='Helvetica-Oblique',
                fontSize=8,
                leading=11,
                textColor=colors.HexColor('#dc2626')
            )

            story = []

            # 1. Header Banner & Case Information
            story.append(Paragraph("CRIMEVISION AI FORENSIC INTELLIGENCE DOSSIER", title_style))
            story.append(Paragraph(f"Multimodal Evidence Examination & Chronological Audit | Report ID: {report_id}", subtitle_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceBefore=2, spaceAfter=12))

            meta_data = [
                [Paragraph("<b>Case Reference:</b>", body_style), Paragraph(str(case_info.get("id")), body_bold),
                 Paragraph("<b>Incident Date:</b>", body_style), Paragraph(str(case_info.get("incident_date", "Unspecified")), body_style)],
                [Paragraph("<b>Case Title:</b>", body_style), Paragraph(str(case_info.get("title")), body_style),
                 Paragraph("<b>Incident Location:</b>", body_style), Paragraph(str(case_info.get("location", "Unspecified")), body_style)],
                [Paragraph("<b>Examiner:</b>", body_style), Paragraph(investigator_name, body_style),
                 Paragraph("<b>Generation Date:</b>", body_style), Paragraph(datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)]
            ]
            t_meta = Table(meta_data, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
            t_meta.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(t_meta)
            story.append(Spacer(1, 14))

            # 2. Forensic Scope & Legal Caveats
            story.append(Paragraph("1. FORENSIC SCOPE & LEGAL DISCLAIMER", h1_style))
            legal_text = (
                "<b>CRITICAL STATUTORY NOTICE:</b> This document contains algorithmic decision-support analysis produced by "
                "multimodal artificial intelligence pipelines (RT-DETR object detection, OpenAI Whisper speech transcription, "
                "and CLIP zero-shot feature mapping). <b>This report does NOT constitute legal proof of guilt, identity certification, "
                "or court-admissible forensic certainty.</b> AI hypotheses are provisional and must be verified by sworn human investigators."
            )
            story.append(Paragraph(legal_text, legal_disclaimer))
            story.append(Spacer(1, 12))

            # 3. Evidence Inventory & Cryptographic SHA-256 Hashes
            story.append(Paragraph("2. EVIDENCE INVENTORY & SHA-256 INTEGRITY AUDIT", h1_style))
            ev_table_rows = [
                [Paragraph("<b>Evidence ID</b>", body_bold), Paragraph("<b>Type</b>", body_bold), Paragraph("<b>Original Filename</b>", body_bold), Paragraph("<b>SHA-256 Digest</b>", body_bold), Paragraph("<b>Size (KB)</b>", body_bold)]
            ]
            for ev in evidence_list:
                ev_table_rows.append([
                    Paragraph(ev.get("id"), body_style),
                    Paragraph(ev.get("media_type", "").upper(), body_style),
                    Paragraph(ev.get("original_name", "")[:22], body_style),
                    Paragraph(f"<font size=7>{ev.get('sha256_hash', 'N/A')[:24]}...</font>", body_style),
                    Paragraph(str(round(ev.get("file_size_bytes", 0)/1024, 1)), body_style)
                ])
            
            t_ev = Table(ev_table_rows, colWidths=[1.1*inch, 0.7*inch, 1.8*inch, 2.6*inch, 0.8*inch])
            t_ev.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(t_ev)
            story.append(Spacer(1, 14))

            # 4. Multimodal Analysis Observations
            story.append(Paragraph("3. MULTIMODAL OBSERVATIONS & DETECTIONS", h1_style))
            for anl in analysis_records:
                ev_id = anl.get("evidence_id")
                m_type = anl.get("media_type")
                story.append(Paragraph(f"<b>Evidence Item: [{ev_id}] ({m_type.upper()})</b>", body_bold))
                
                if anl.get("caption"):
                    story.append(Paragraph(f"<i>Scene Caption:</i> {anl.get('caption')}", body_style))

                dets = anl.get("detections", [])
                if dets:
                    det_summary = ", ".join([f"{d.get('label')} ({int(d.get('confidence',0)*100)}%)" for d in dets[:6]])
                    story.append(Paragraph(f"<i>Key Detections:</i> {det_summary}", body_style))

                for obs in anl.get("observations", [])[:3]:
                    story.append(Paragraph(f"• {obs}", body_style))
                story.append(Spacer(1, 6))

            # 5. Chronological Unified Timeline
            story.append(Spacer(1, 8))
            story.append(Paragraph("4. UNIFIED CHRONOLOGICAL EVENT TIMELINE", h1_style))
            time_rows = [
                [Paragraph("<b>Time Window</b>", body_bold), Paragraph("<b>Event Category</b>", body_bold), Paragraph("<b>Description & Observations</b>", body_bold), Paragraph("<b>Status</b>", body_bold)]
            ]
            for evt in timeline_events[:15]:
                t_window = f"{evt.get('timestamp_start', 0.0):.1f}s - {evt.get('timestamp_end', 0.0):.1f}s"
                time_rows.append([
                    Paragraph(t_window, body_style),
                    Paragraph(evt.get("event_type", "").replace("_", " ").title(), body_style),
                    Paragraph(evt.get("description", ""), body_style),
                    Paragraph(evt.get("verification_status", "unverified").upper(), body_style)
                ])

            t_time = Table(time_rows, colWidths=[1.2*inch, 1.4*inch, 3.4*inch, 1.0*inch])
            t_time.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(t_time)
            story.append(Spacer(1, 14))

            # 6. Investigator Sign-Off & Verification
            story.append(Paragraph("5. EXAMINER SIGN-OFF & HUMAN VERIFICATION", h1_style))
            sign_data = [
                [Paragraph("<b>Investigator Notes:</b>", body_bold), Paragraph(notes or "No additional field exceptions noted.", body_style)],
                [Paragraph("<b>Lead Examiner Signature:</b>", body_bold), Paragraph("________________________________________", body_style)],
                [Paragraph("<b>Verification Date:</b>", body_bold), Paragraph("____________________   <b>Seal/Badge No:</b> ____________________", body_style)]
            ]
            t_sign = Table(sign_data, colWidths=[2.2*inch, 4.8*inch])
            t_sign.setStyle(TableStyle([
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t_sign)

            # Build PDF
            doc.build(story, canvasmaker=NumberedCanvas)
            return str(output_path)

        except Exception as e:
            logger.error(f"ReportLab PDF generation encountered exception: {e}")
            # Fallback simple generator
            with open(output_path, "wb") as f:
                f.write(f"%PDF-1.4\n% Forensic Dossier for {case_info.get('id')}\n% Error fallback: {e}\n%%EOF".encode("utf-8"))
            return str(output_path)

report_generator_service = ReportGeneratorService()
