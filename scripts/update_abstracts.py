"""Refresh paper abstracts without making readers contact external services."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
ATOM = "{http://www.w3.org/2005/Atom}"
PAPERS = {
    "clu": {
        "title": "Bridging Syntax and Semantics: Distilling LLMs into Symbolic Rules for Few-Shot Relation Extraction",
        "kind": "crossref",
        "api": "https://api.crossref.org/works/10.2139/ssrn.7686659",
        "source_name": "SSRN",
        "source_url": "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7686659",
    },
    "triage": {
        "title": "Accuracy Is Not Safety: Ordinal, Calibrated Multimodal Prediction of KTAS Triage Levels",
        "kind": "pdf",
        "api": "https://drive.google.com/uc?export=download&id=1Mvf5Zgpgp6ZcPXqHpdKvtK7r3QddKdOM",
        "source_name": "Manuscript",
        "source_url": "https://drive.google.com/file/d/1Mvf5Zgpgp6ZcPXqHpdKvtK7r3QddKdOM/view",
    },
    "xmedfusion": {
        "title": "XMedFusion: A Knowledge-Guided Multimodal Perception and Reasoning Framework for Autonomous Medical Systems",
        "kind": "arxiv",
        "api": "https://export.arxiv.org/api/query?id_list=2606.14766",
        "source_name": "arXiv",
        "source_url": "https://arxiv.org/abs/2606.14766",
    },
}


def download(url):
    request = Request(url, headers={
        "User-Agent": "HamzaRiazPortfolio/1.0 (+https://hamzariaz970.github.io/)",
        "Cache-Control": "no-cache",
    })
    with urlopen(request, timeout=20) as response:
        data = response.read(12_000_001)
    if len(data) > 12_000_000:
        raise ValueError("Source exceeds the download limit")
    return data


def title_key(title):
    return re.sub(r"[^a-z0-9]", "", title.lower())


class AbstractText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

    def handle_endtag(self, tag):
        if tag.split(":")[-1] == "p":
            self.parts.append("\n\n")


def clean_text(text):
    paragraphs = re.split(r"\n\s*\n", text.strip())
    return "\n\n".join(" ".join(part.split()) for part in paragraphs if part.strip())


def clean_pdf_text(text):
    # Retain real compound words while joining words split across printed lines.
    prefixes = {
        "under", "over", "cross", "high", "low", "single", "severe",
        "expert", "class", "patient", "resource", "modality", "well",
        "self", "non", "few", "task", "data", "knowledge", "decision",
    }

    def join_word(match):
        left, right = match.groups()
        hyphen = "-" if left.lower() in prefixes else ""
        return left + hyphen + right

    text = re.sub(r"([A-Za-z]+)-[ \t]*\n[ \t]*([a-z]+)", join_word, text)
    text = re.sub(r"(?<=[A-Za-z])(?=\d+\s*×)", " ", text)
    text = re.sub(r"(\d)\s*×\s*(\d)", r"\1 × \2", text)
    return " ".join(text.replace("\u00ad", "").split())


def parse_abstract(paper, raw):
    if paper["kind"] == "crossref":
        message = json.loads(raw)["message"]
        title = message["title"][0]
        parser = AbstractText()
        parser.feed(message.get("abstract", ""))
        abstract = clean_text("".join(parser.parts))
    elif paper["kind"] == "arxiv":
        entry = ET.fromstring(raw).find(f"{ATOM}entry")
        if entry is None:
            raise ValueError("arXiv returned no paper")
        title = entry.findtext(f"{ATOM}title", "")
        abstract = clean_text(entry.findtext(f"{ATOM}summary", ""))
    else:
        if not raw.startswith(b"%PDF"):
            raise ValueError("The manuscript link did not return a PDF")
        reader = PdfReader(BytesIO(raw))
        text = "\n".join(page.extract_text(extraction_mode="layout") for page in reader.pages[:4])
        if title_key(paper["title"]) not in title_key(text):
            raise ValueError("The PDF title does not match the requested paper")
        title = paper["title"]
        match = re.search(
            r"(?:^|\n)\s*Abstract\s*\n(.*?)(?=\n\s*(?:Keywords|Key words|1[.\s]+Introduction))",
            text, re.IGNORECASE | re.DOTALL,
        )
        if not match:
            raise ValueError("Could not locate the complete PDF abstract")
        abstract = clean_pdf_text(match.group(1))
    if title_key(title) != title_key(paper["title"]):
        raise ValueError("The source returned a different paper")
    if not 100 <= len(abstract) <= 12_000:
        raise ValueError("The source returned an empty or invalid abstract")
    return abstract


def fetch_abstract(item):
    paper_id, paper = item
    abstract = parse_abstract(paper, download(paper["api"]))
    return paper_id, {
        "title": paper["title"],
        "abstract": abstract,
        "source_name": paper["source_name"],
        "source_url": paper["source_url"],
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def valid_cache(record, paper):
    return (
        isinstance(record, dict)
        and record.get("title") == paper["title"]
        and isinstance(record.get("abstract"), str)
        and 100 <= len(record["abstract"]) <= 12_000
        and record.get("source_url") == paper["source_url"]
        and isinstance(record.get("retrieved_at"), str)
    )


def refresh(saved):
    updated = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        pending = {paper_id: executor.submit(fetch_abstract, (paper_id, paper)) for paper_id, paper in PAPERS.items()}
        for paper_id, future in pending.items():
            try:
                _, updated[paper_id] = future.result()
                print(f"Updated abstract: {paper_id}")
            except Exception as error:
                record = saved.get(paper_id)
                if not valid_cache(record, PAPERS[paper_id]):
                    raise ValueError(f"No usable abstract for {paper_id}: {error}") from error
                updated[paper_id] = record
                print(f"Keeping the saved abstract for {paper_id}: {error}")
    return {"papers": updated}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "abstracts.json")
    parser.add_argument("--published-cache", help="Reuse the latest published abstracts if a source is unavailable")
    args = parser.parse_args()
    saved = json.loads(args.output.read_text()).get("papers", {}) if args.output.exists() else {}
    if args.published_cache:
        try:
            published = json.loads(download(args.published_cache))["papers"]
            for paper_id, paper in PAPERS.items():
                record = published.get(paper_id)
                local = saved.get(paper_id, {})
                if valid_cache(record, paper) and record["retrieved_at"] > local.get("retrieved_at", ""):
                    saved[paper_id] = record
        except Exception as error:
            print(f"Published cache unavailable; using the repository copy: {error}")
    result = refresh(saved)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(args.output)


if __name__ == "__main__":
    main()
