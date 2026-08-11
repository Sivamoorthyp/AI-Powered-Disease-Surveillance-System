import unittest
import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup local paths for test imports
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database import Base
from app import models, crud, analytics, ai_engine

class TestSurveillanceBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Set up a testing SQLite database
        cls.engine = create_engine("sqlite:///./test_surveillance.db", connect_args={"check_same_thread": False})
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()
        if os.path.exists("./test_surveillance.db"):
            os.remove("./test_surveillance.db")

    def setUp(self):
        self.db = self.SessionLocal()
        
        # Clear entries
        self.db.query(models.CaseReport).delete()
        self.db.query(models.Disease).delete()
        self.db.query(models.User).delete()
        self.db.commit()

        # Seed essential entities
        self.disease = models.Disease(
            name="Test Malaria",
            category="Vector-borne",
            warning_threshold=5,
            symptoms="High fever, chills",
            recommended_medicines="ACT",
            containment_guidelines="Chemical spray"
        )
        self.db.add(self.disease)
        self.db.commit()
        self.db.refresh(self.disease)

        self.user = models.User(
            email="asha@test.com",
            phone="9000000000",
            name="Asha Test",
            role="ASHA Worker",
            hashed_password="hashed_pass_mock"
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()

    def test_analytics_and_statistics(self):
        # 1. Add mock reports
        today = datetime.date.today()
        
        c1 = models.CaseReport(
            patient_id="PAT-1",
            disease_id=self.disease.id,
            severity="Medium",
            age=25,
            gender="Male",
            village="Hinjili",
            gram_panchayat="Hinjili GP",
            block="Berhampur",
            district="Ganjam",
            latitude=19.314,
            longitude=84.794,
            status="Confirmed",
            clinical_status="Isolation",
            report_date=today
        )
        c2 = models.CaseReport(
            patient_id="PAT-2",
            disease_id=self.disease.id,
            severity="High",
            age=30,
            gender="Female",
            village="Hinjili",
            gram_panchayat="Hinjili GP",
            block="Berhampur",
            district="Ganjam",
            latitude=19.315,
            longitude=84.795,
            status="Confirmed",
            clinical_status="Hospitalized",
            report_date=today
        )
        
        self.db.add_all([c1, c2])
        self.db.commit()

        # Check district aggregations
        stats = analytics.get_district_stats(self.db, "Ganjam")
        self.assertEqual(stats["disease_count"], 2)
        self.assertEqual(stats["active_cases"], 2)
        self.assertEqual(stats["most_common_disease"], "Test Malaria")
        self.assertEqual(stats["today_cases"], 2)

    def test_ai_dbscan_clustering(self):
        # Create a cluster of reports closely spaced near latitude 20.29, longitude 85.82
        today = datetime.date.today()
        for i in range(4):
            c = models.CaseReport(
                patient_id=f"PAT-CLUS-{i}",
                disease_id=self.disease.id,
                severity="Medium",
                age=28,
                gender="Male",
                village="Bhubaneswar GP",
                gram_panchayat="GP",
                block="Bhubaneswar",
                district="Khordha",
                latitude=20.296 + i * 0.0001,  # within a few meters
                longitude=85.824 + i * 0.0001,
                status="Confirmed",
                clinical_status="Isolation",
                report_date=today
            )
            self.db.add(c)
        self.db.commit()

        # Run cluster detection
        clusters = ai_engine.detect_spatial_clusters(self.db, eps_km=2.0, min_samples=3)
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0]["case_count"], 4)
        self.assertAlmostEqual(clusters[0]["center_lat"], 20.296, places=2)

    def test_chatbot_agent_rules(self):
        # Run chatbot logic
        resp = ai_engine.run_ai_chatbot(self.db, "What is the advice for Dengue outbreaks?")
        self.assertIn("Dengue Fever Prevention Guidelines", resp)
        self.assertIn("Aedes mosquito", resp)

if __name__ == '__main__':
    unittest.main()
