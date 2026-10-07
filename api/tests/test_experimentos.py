import os
import tempfile
import unittest
from pathlib import Path

temporary = tempfile.TemporaryDirectory()
os.environ["FAZENDA_DB_PATH"] = str(Path(temporary.name) / "test.db")
os.environ["FAZENDA_API_TOKEN"] = "local-test-token"

from fastapi.testclient import TestClient
from app.main import app


class ExperimentTests(unittest.TestCase):
    def test_new_experiment_keeps_readings_and_results_separate(self):
        with TestClient(app) as client:
            headers = {"Authorization": "Bearer local-test-token"}
            profile = client.post("/culturas", headers=headers, json={
                "nome": "Alface teste", "umidade_min": 60, "umidade_max": 70,
                "ce_min": 1000, "ce_max": 1800, "temperatura_min": 15, "temperatura_max": 24,
            })
            self.assertEqual(profile.status_code, 201)
            new = client.post("/experimentos", headers=headers, json={
                "nome": "Vaso independente", "id_cultura": profile.json()["id_cultura"], "data_inicio": "2026-10-07",
            })
            self.assertEqual(new.status_code, 201)
            new_id = new.json()["id_experimento"]
            self.assertNotEqual(new_id, 1)
            self.assertIn(new_id, [row["id_experimento"] for row in client.get("/experimentos", headers=headers).json()])
            self.assertEqual(client.get("/experimentos").status_code, 401)
            invalid = client.post("/experimentos", headers=headers, json={"nome": "Inválido", "id_cultura": 999999, "data_inicio": "2026-10-07"})
            self.assertEqual(invalid.status_code, 422)
            invalid = client.post("/experimentos", headers=headers, json={"nome": "", "id_cultura": 1, "data_inicio": "inválido"})
            self.assertEqual(invalid.status_code, 422)
            reading = client.post("/leituras", headers=headers, json={"id_experimento": 1, "temperatura": 22, "umidade": 70, "ce": 235})
            self.assertEqual(reading.status_code, 201)
            self.assertEqual(client.get(f"/leituras?id_experimento={new_id}", headers=headers).json(), [])
            self.assertEqual(client.get(f"/leituras/ultima?id_experimento={new_id}", headers=headers).status_code, 404)
            self.assertEqual(client.get(f"/predicoes?id_experimento={new_id}", headers=headers).json()["predicoes"], [])
            self.assertEqual(client.get(f"/alertas?id_experimento={new_id}", headers=headers).json(), [])
            self.assertEqual(client.get(f"/modelo/metricas?id_experimento={new_id}", headers=headers).json(), [])
            self.assertEqual(client.get("/leituras/ultima?id_experimento=1", headers=headers).json()["ce"], 235)


if __name__ == "__main__":
    unittest.main()
