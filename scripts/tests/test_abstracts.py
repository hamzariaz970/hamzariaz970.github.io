import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import update_abstracts as abstracts


class AbstractRefreshTests(unittest.TestCase):
    def test_rejects_metadata_for_a_different_paper(self):
        raw = json.dumps({"message": {"title": ["A different paper"], "abstract": "Some abstract. " * 15}}).encode()
        with self.assertRaisesRegex(ValueError, "different paper"):
            abstracts.parse_abstract(abstracts.PAPERS["clu"], raw)

    def test_pdf_cleanup_keeps_real_compound_words(self):
        text = "A model pre-\ndicts the com-\nplaint under5×10 cross-\nvalidation and finds under-\ntriage cases."
        self.assertEqual(abstracts.clean_pdf_text(text), "A model predicts the complaint under 5 × 10 cross-validation and finds under-triage cases.")

    def test_failed_source_keeps_its_saved_abstract(self):
        saved = {
            paper_id: {
                "title": paper["title"], "abstract": "Saved abstract text. " * 15,
                "source_url": paper["source_url"], "retrieved_at": "2026-11-13T00:00:00+00:00",
            }
            for paper_id, paper in abstracts.PAPERS.items()
        }
        def fetch(item):
            paper_id, _ = item
            if paper_id == "clu":
                raise OSError("Temporary source outage")
            return paper_id, {**saved[paper_id], "abstract": "Refreshed abstract text. " * 15}
        with patch.object(abstracts, "fetch_abstract", side_effect=fetch):
            result = abstracts.refresh(saved)["papers"]
        self.assertEqual(result["clu"], saved["clu"])
        self.assertNotEqual(result["triage"]["abstract"], saved["triage"]["abstract"])

    def test_missing_abstract_stops_publication(self):
        with patch.object(abstracts, "fetch_abstract", side_effect=OSError("Unavailable")):
            with self.assertRaisesRegex(ValueError, "No usable abstract"):
                abstracts.refresh({})


if __name__ == "__main__":
    unittest.main()
