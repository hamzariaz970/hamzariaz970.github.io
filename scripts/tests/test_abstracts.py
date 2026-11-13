import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import update_abstracts as abstracts


class AbstractRefreshTests(unittest.TestCase):
    def setUp(self):
        self.saved = {
            paper_id: {
                "title": paper["title"], "abstract": "Saved abstract text. " * 15,
                "source_url": paper["source_url"], "retrieved_at": "2026-11-13T00:00:00+00:00",
            }
            for paper_id, paper in abstracts.PAPERS.items()
        }

    def test_rejects_metadata_for_a_different_paper(self):
        raw = json.dumps({"message": {"title": ["A different paper"], "abstract": "Some abstract. " * 15}}).encode()
        with self.assertRaisesRegex(ValueError, "different paper"):
            abstracts.parse_abstract(abstracts.PAPERS["clu"], raw)

    def test_manual_abstract_does_not_contact_its_source(self):
        papers = {"triage": abstracts.PAPERS["triage"]}
        with patch.object(abstracts, "PAPERS", papers), patch.object(abstracts, "download") as download:
            result = abstracts.refresh(self.saved)["papers"]
        download.assert_not_called()
        self.assertEqual(result["triage"], self.saved["triage"])

    def test_failed_source_keeps_its_saved_abstract(self):
        def fetch(item):
            paper_id, _ = item
            if paper_id == "clu":
                raise OSError("Temporary source outage")
            return paper_id, {**self.saved[paper_id], "abstract": "Refreshed abstract text. " * 15}

        with patch.object(abstracts, "fetch_abstract", side_effect=fetch):
            result = abstracts.refresh(self.saved)["papers"]
        self.assertEqual(result["clu"], self.saved["clu"])
        self.assertEqual(result["triage"], self.saved["triage"])
        self.assertNotEqual(result["xmedfusion"]["abstract"], self.saved["xmedfusion"]["abstract"])

    def test_published_cache_cannot_replace_manual_text(self):
        published = {
            paper_id: {**record, "abstract": "Newer published text. " * 15, "retrieved_at": "2026-11-14T00:00:00+00:00"}
            for paper_id, record in self.saved.items()
        }
        with TemporaryDirectory() as directory:
            output = Path(directory) / "abstracts.json"
            output.write_text(json.dumps({"papers": self.saved}))
            arguments = ["update_abstracts.py", "--output", str(output), "--published-cache", "https://example.org/abstracts.json"]
            with patch.object(sys, "argv", arguments), patch.object(abstracts, "download", return_value=json.dumps({"papers": published}).encode()), patch.object(abstracts, "refresh", side_effect=lambda saved: {"papers": saved}):
                abstracts.main()
            result = json.loads(output.read_text())["papers"]
        self.assertEqual(result["triage"], self.saved["triage"])
        self.assertEqual(result["xmedfusion"], published["xmedfusion"])

    def test_missing_abstract_stops_publication(self):
        papers = {"clu": abstracts.PAPERS["clu"]}
        with patch.object(abstracts, "PAPERS", papers), patch.object(abstracts, "fetch_abstract", side_effect=OSError("Unavailable")):
            with self.assertRaisesRegex(ValueError, "No usable abstract"):
                abstracts.refresh({})


if __name__ == "__main__":
    unittest.main()
