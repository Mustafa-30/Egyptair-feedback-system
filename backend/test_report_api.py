"""Test the report generation API directly"""
import sys
sys.path.insert(0, '.')

import os
os.chdir('d:/Gruaduation project/Code of project/Egyptair-feedback-system/backend')

from app.core.database import SessionLocal
from app.services.report_service import ReportService
import traceback

def test_report():
    db = SessionLocal()
    try:
        print("Creating ReportService...")
        service = ReportService(db)
        print(f"Arabic font: {service.arabic_font}")
        
        print("Getting filtered feedback...")
        feedbacks, stats = service.get_filtered_feedback()
        print(f"Feedbacks: {len(feedbacks)}")
        print(f"Stats: {stats}")
        
        print("Calculating NPS...")
        nps = service.calculate_nps(stats)
        print(f"NPS: {nps}")
        
        print("Getting top routes...")
        routes = service.get_top_routes(feedbacks)
        print(f"Top routes: {len(routes)} routes found")
        
        print("Generating PDF report...")
        sections = {
            'executiveSummary': True,
            'sentimentChart': True,
            'trendChart': True,
            'statsTable': True,
            'negativeSamples': True,
            'npsScore': True,
            'topRoutes': True
        }
        
        filepath, file_size = service.generate_pdf_report(
            title='Test Report',
            feedbacks=feedbacks,
            stats=stats,
            date_from=None,
            date_to=None,
            sections=sections
        )
        print(f"Report generated: {filepath}")
        print(f"Size: {file_size} bytes")
        print("SUCCESS!")
        
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_report()
